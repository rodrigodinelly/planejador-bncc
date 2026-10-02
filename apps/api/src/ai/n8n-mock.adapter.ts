import {
  Injectable,
  Logger,
  BadGatewayException,
  GatewayTimeoutException,
} from '@nestjs/common';
import {
  N8nGenerateRequestDto,
  N8nGenerateResponseDto,
} from './dto/n8n-integration.dto';

@Injectable()
export class N8nMockAdapter {
  private readonly logger = new Logger(N8nMockAdapter.name);

  async generate(
    payload: N8nGenerateRequestDto,
    options?: {
      delayMs?: number;
      simulateError?: 'timeout' | 'service_error' | 'invalid_contract';
    },
  ): Promise<N8nGenerateResponseDto> {
    const delay = options?.delayMs ?? 100;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Suporte a flags de simulação de erro para testes determinísticos
    const instruction = payload.instrucao || '';
    const shouldTimeout =
      options?.simulateError === 'timeout' ||
      instruction.includes('__FORCE_TIMEOUT__');
    const shouldFailService =
      options?.simulateError === 'service_error' ||
      instruction.includes('__FORCE_SERVICE_ERROR__');
    const shouldInvalidateContract =
      options?.simulateError === 'invalid_contract' ||
      instruction.includes('__FORCE_INVALID_CONTRACT__');

    if (shouldTimeout) {
      this.logger.warn('[Mock] Simulando Gateway Timeout (60s)...');
      throw new GatewayTimeoutException(
        'O serviço de IA demorou para responder (tempo limite de 60 segundos esgotado). Nenhum plano foi salvo.',
      );
    }

    if (shouldFailService) {
      this.logger.warn('[Mock] Simulando erro inesperado no serviço externo...');
      throw new BadGatewayException(
        'Não foi possível gerar o rascunho. O serviço externo retornou um erro inesperado.',
      );
    }

    if (shouldInvalidateContract) {
      this.logger.warn('[Mock] Simulando resposta fora do contrato...');
      // Retornar um payload corrompido que falhará na validação do Zod
      return {
        success: false as any,
        sessao: payload.sessao,
        habilidade: payload.habilidade,
        answer: 'curto',
        format: 'json' as any,
      };
    }

    // Extração do código ou título da habilidade para estruturar o título do rascunho
    const firstLineHabilidade = payload.habilidade.split('\n')[0] || 'Habilidade BNCC';
    const codigoMatch = firstLineHabilidade.match(/^[A-Z0-9]+/);
    const codigoPrincipal = codigoMatch ? codigoMatch[0] : 'BNCC';

    const recursosTexto = payload.recursos_digitais
      ? 'Dispositivos digitais (tablets/computadores), projetor multimídia e software educativo interativo.'
      : 'Materiais pedagógicos concretos, cartolinas, canetas coloridas e blocos lógicos manipuláveis (Computação Desplugada).';

    const markdownAnswer = `# Plano de Aula: Planejamento Assistido (${codigoPrincipal})

## 1. Identificação e Objetivos de Aprendizagem
- **Habilidades BNCC Trabalhadas**:
${payload.habilidade.split('\n').map((h) => `  - ${h}`).join('\n')}
- **Objetivo Geral**: Proporcionar aos estudantes a compreensão prática dos conceitos pedagógicos fundamentados nas competências gerais da BNCC.

## 2. Duração e Recursos Didáticos
- **Duração Estimada**: ${payload.duracao} minutos
- **Recursos Necessários**: ${recursosTexto}
- **Instruções Pedagógicas Específicas**: ${payload.instrucao || 'Desenvolver a aula com foco na participação ativa e investigação colaborativa.'}

## 3. Desenvolvimento Metodológico Passo a Passo
- **Momento 1 — Acolhimento e Levantamento Prévio (10 min)**:
  - Roda de conversa inicial para ativação de conhecimentos prévios relacionados ao tema.
  - Apresentação de uma situação-problema cotidiana conectada à habilidade.

- **Momento 2 — Investigação e Prática Guiada (${Math.max(20, payload.duracao - 25)} min)**:
  - Divisão da turma em duplas ou pequenos grupos produtivos.
  - Execução da atividade central proposta, estimulando autonomia e argumentação entre os pares.

- **Momento 3 — Síntese e Sistematização (15 min)**:
  - Compartilhamento das soluções encontradas pelos grupos.
  - Registro coletivo dos principais aprendizados consolidados durante a experiência.

## 4. Avaliação e Adaptações Pedagógicas
- **Critérios de Avaliação**: Observação formativa contínua do engajamento, clareza na exposição de ideias e alcance dos objetivos propostos.
- **Diferenciação Pedagógica**: Prever apoio visual e mediação individualizada para estudantes que demandem maior suporte pedagógico.
`;

    return {
      success: true,
      sessao: payload.sessao,
      habilidade: payload.habilidade,
      answer: markdownAnswer,
      format: 'markdown',
    };
  }
}
