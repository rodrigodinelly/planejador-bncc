import {
  Injectable,
  Logger,
  BadGatewayException,
  GatewayTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  N8nGenerateRequestDto,
  N8nGenerateResponseDto,
  N8nResponseSchema,
} from './dto/n8n-integration.dto';

@Injectable()
export class N8nClientService {
  private readonly logger = new Logger(N8nClientService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(
    payload: N8nGenerateRequestDto,
    requestId?: string,
  ): Promise<N8nGenerateResponseDto> {
    const webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');
    const apiKey = this.configService.get<string>('N8N_API_KEY');
    const timeoutMs = Number(this.configService.get<number>('N8N_TIMEOUT_MS')) || 60000;

    if (!webhookUrl) {
      throw new BadGatewayException(
        'URL do webhook n8n não configurada no ambiente.',
      );
    }

    const currentRequestId = requestId || crypto.randomUUID();
    this.logger.log(`[n8n] Iniciando requisição externa. RequestId: ${currentRequestId}, Timeout: ${timeoutMs}ms`);

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    const authHeaderName = this.configService.get<string>('N8N_AUTH_HEADER_NAME') || 'x-api-key';

    try {
      // Política de Zero Retries: apenas 1 chamada HTTP direta
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [authHeaderName]: apiKey || '',
          'x-request-id': currentRequestId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(
          `[n8n] Erro HTTP retornado pelo serviço: Status ${response.status} ${response.statusText}. RequestId: ${currentRequestId}`,
        );
        throw new BadGatewayException(
          'Não foi possível gerar o rascunho. O serviço externo retornou um erro inesperado.',
        );
      }

      const rawJson = await response.json();

      // Validação estrita do contrato com schema Zod
      const parseResult = N8nResponseSchema.safeParse(rawJson);
      if (!parseResult.success) {
        this.logger.error(
          `[n8n] Resposta fora do contrato especificado. RequestId: ${currentRequestId}. Erros: ${JSON.stringify(parseResult.error.format())}`,
        );
        throw new BadGatewayException(
          'A resposta fornecida pelo serviço de IA não atende ao contrato de dados esperado.',
        );
      }

      this.logger.log(`[n8n] Resposta recebida com sucesso e validada. RequestId: ${currentRequestId}`);
      return parseResult.data;
    } catch (error: any) {
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        this.logger.error(
          `[n8n] Tempo limite de ${timeoutMs}ms esgotado aguardando resposta. RequestId: ${currentRequestId}`,
        );
        throw new GatewayTimeoutException(
          'O serviço de IA demorou para responder (tempo limite de 60 segundos esgotado). Nenhum plano foi salvo.',
        );
      }

      if (error instanceof BadGatewayException || error instanceof GatewayTimeoutException) {
        throw error;
      }

      this.logger.error(
        `[n8n] Falha de conexão ao comunicar com o webhook. RequestId: ${currentRequestId}`,
      );
      throw new BadGatewayException(
        'Falha de conectividade com o serviço de IA. Verifique a rede e tente novamente.',
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
