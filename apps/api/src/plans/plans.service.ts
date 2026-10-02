import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AiRunStatus, PlanStatus } from '@prisma/client';
import { N8nGenerateRequestDto } from '../ai/dto/n8n-integration.dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  private extractTitleFromMarkdown(markdown: string, fallbackHabilidadeCodigo: string): string {
    const lines = markdown.split('\n');
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }
    return `Plano de Aula - ${fallbackHabilidadeCodigo}`;
  }

  async generate(
    user: { id: string; email: string },
    dto: GeneratePlanDto,
    requestId?: string,
  ) {
    const isUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    const uuidIds = dto.habilidadeIds.filter(isUuid);
    const codeIds = dto.habilidadeIds.filter((id) => !isUuid(id));

    const habilidades = await this.prisma.habilidade.findMany({
      where: {
        OR: [
          ...(uuidIds.length > 0 ? [{ id: { in: uuidIds } }] : []),
          ...(codeIds.length > 0 ? [{ codigo: { in: codeIds } }] : []),
        ],
      },
    });

    if (habilidades.length === 0) {
      throw new BadRequestException('Nenhuma habilidade válida encontrada no catálogo.');
    }

    const formattedHabilidades = this.aiService.formatHabilidadesString(habilidades);

    const requestPayload: N8nGenerateRequestDto = {
      sessao: user.email,
      habilidade: formattedHabilidades,
      instrucao: dto.instrucao || '',
      duracao: dto.duracao,
      recursos_digitais: dto.recursosDigitais,
    };

    // 1. Criar registro de auditoria da IA com status PENDING
    const aiRun = await this.prisma.aiRun.create({
      data: {
        userId: user.id,
        status: AiRunStatus.PENDING,
        requestPayload: requestPayload as any,
        startedAt: new Date(),
      },
    });

    let aiResponse;
    try {
      // 2. Chamar o serviço de IA (n8n real ou mock determinístico)
      aiResponse = await this.aiService.callAiService(requestPayload, requestId);
    } catch (error: any) {
      // Em falha/timeout: marcar AiRun como FAILED e NÃO criar nenhum plano parcial (Princípio V)
      this.logger.warn(`[PlansService] Geração falhou para AiRun ${aiRun.id}. Marcando como FAILED.`);
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: AiRunStatus.FAILED,
          errorMessage: error?.message || 'Falha ao processar resposta do provedor de IA.',
          finishedAt: new Date(),
        },
      });

      // Relançar a exceção para que o controller retorne o código HTTP apropriado (502 / 504)
      throw error;
    }

    // 3. Em sucesso: transação relacional atômica
    const planoTitulo = this.extractTitleFromMarkdown(
      aiResponse.answer,
      habilidades[0]?.codigo || 'BNCC',
    );

    const createdPlan = await this.prisma.$transaction(async (tx) => {
      // Atualizar AiRun para SUCCEEDED
      await tx.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: AiRunStatus.SUCCEEDED,
          responsePayload: aiResponse as any,
          finishedAt: new Date(),
        },
      });

      // Gravar plano de aula em estado RASCUNHO com aiAssisted: true
      const plan = await tx.plan.create({
        data: {
          userId: user.id,
          titulo: planoTitulo,
          duracao: dto.duracao,
          recursosDigitais: dto.recursosDigitais,
          instrucao: dto.instrucao || '',
          markdownContent: aiResponse.answer,
          status: PlanStatus.RASCUNHO,
          aiAssisted: true,
          aiRunId: aiRun.id,
        },
      });

      // Criar vínculos muitos-para-muitos com as habilidades
      await tx.planHabilidade.createMany({
        data: habilidades.map((h) => ({
          planId: plan.id,
          habilidadeId: h.id,
        })),
      });

      return plan;
    });

    return this.findOneByUser(user.id, createdPlan.id);
  }

  async findAllByUser(userId: string) {
    const plans = await this.prisma.plan.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        planHabilidades: {
          include: { habilidade: true },
        },
      },
    });

    const data = plans.map((plan) => ({
      id: plan.id,
      titulo: plan.titulo,
      duracao: plan.duracao,
      recursosDigitais: plan.recursosDigitais,
      status: plan.status,
      aiAssisted: plan.aiAssisted,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      habilidades: plan.planHabilidades.map((ph) => ({
        id: ph.habilidade.id,
        codigo: ph.habilidade.codigo,
        descricao: ph.habilidade.descricao,
        eixo: ph.habilidade.eixo,
        ano: ph.habilidade.ano,
        nivel: ph.habilidade.nivel,
      })),
    }));

    return { total: data.length, data };
  }

  async findOneByUser(userId: string, planId: string) {
    // Isolamento Estrito: a busca restringe diretamente por id e userId
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: planId,
        userId,
      },
      include: {
        planHabilidades: {
          include: { habilidade: true },
        },
      },
    });

    // Se não existir ou pertencer a outro professor, retorna 404 (oculta existência)
    if (!plan) {
      throw new NotFoundException('Plano de aula não encontrado.');
    }

    return {
      id: plan.id,
      titulo: plan.titulo,
      duracao: plan.duracao,
      recursosDigitais: plan.recursosDigitais,
      instrucao: plan.instrucao,
      markdownContent: plan.markdownContent,
      status: plan.status,
      aiAssisted: plan.aiAssisted,
      aiRunId: plan.aiRunId,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      habilidades: plan.planHabilidades.map((ph) => ({
        id: ph.habilidade.id,
        codigo: ph.habilidade.codigo,
        descricao: ph.habilidade.descricao,
        eixo: ph.habilidade.eixo,
        ano: ph.habilidade.ano,
        nivel: ph.habilidade.nivel,
      })),
    };
  }

  async updateByUser(userId: string, planId: string, dto: UpdatePlanDto) {
    // Verifica primeiro a propriedade do plano
    await this.findOneByUser(userId, planId);

    const updated = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        titulo: dto.titulo,
        markdownContent: dto.markdownContent,
        updatedAt: new Date(),
      },
      include: {
        planHabilidades: {
          include: { habilidade: true },
        },
      },
    });

    return {
      id: updated.id,
      titulo: updated.titulo,
      duracao: updated.duracao,
      recursosDigitais: updated.recursosDigitais,
      instrucao: updated.instrucao,
      markdownContent: updated.markdownContent,
      status: updated.status,
      aiAssisted: updated.aiAssisted,
      aiRunId: updated.aiRunId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      habilidades: updated.planHabilidades.map((ph) => ({
        id: ph.habilidade.id,
        codigo: ph.habilidade.codigo,
        descricao: ph.habilidade.descricao,
        eixo: ph.habilidade.eixo,
        ano: ph.habilidade.ano,
        nivel: ph.habilidade.nivel,
      })),
    };
  }
}
