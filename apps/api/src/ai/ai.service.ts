import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8nClientService } from './n8n-client.service';
import { N8nMockAdapter } from './n8n-mock.adapter';
import {
  N8nGenerateRequestDto,
  N8nGenerateResponseDto,
  N8nResponseSchema,
} from './dto/n8n-integration.dto';
import { Habilidade } from '@prisma/client';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly n8nClient: N8nClientService,
    private readonly mockAdapter: N8nMockAdapter,
  ) {}

  formatHabilidadesString(habilidades: Habilidade[]): string {
    return habilidades
      .map((h) => `${h.codigo} — ${h.descricao}`)
      .join('\n');
  }

  isMockEnabled(): boolean {
    const mockEnv = this.configService.get<string>('N8N_MOCK_ENABLED');
    const mockMode = this.configService.get<string>('N8N_MOCK_MODE');
    const n8nMode = this.configService.get<string>('N8N_MODE');
    const webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');

    // Se qualquer variável indicar mock explicitamente:
    if (mockEnv === 'true' || mockMode === 'true' || n8nMode === 'mock') {
      return true;
    }

    // Se explicitamente configurado como real com URL presente:
    if ((mockEnv === 'false' || mockMode === 'false' || n8nMode === 'real') && webhookUrl) {
      return false;
    }

    // Padrão seguro: se não houver URL de webhook configurada, opera em mock
    return !webhookUrl;
  }

  async callAiService(
    requestDto: N8nGenerateRequestDto,
    requestId?: string,
  ): Promise<N8nGenerateResponseDto> {
    if (this.isMockEnabled()) {
      this.logger.log(`[AiService] Utilizando adaptador Mock determinístico local para requisição (${requestId || 'auto'})`);
      const rawResult = await this.mockAdapter.generate(requestDto);
      // Validar mesmo a saída do mock contra o schema Zod para garantir consistência
      const parseResult = N8nResponseSchema.safeParse(rawResult);
      if (!parseResult.success) {
        this.logger.error(
          `[AiService/Mock] Resposta fora do contrato especificado. RequestId: ${requestId || 'auto'}. Erros: ${JSON.stringify(parseResult.error.format())}`,
        );
        throw new BadGatewayException(
          'A resposta fornecida pelo serviço de IA não atende ao contrato de dados esperado.',
        );
      }
      return parseResult.data;
    }

    this.logger.log(`[AiService] Encaminhando requisição ao workflow n8n real (${requestId || 'auto'})`);
    return this.n8nClient.generate(requestDto, requestId);
  }
}
