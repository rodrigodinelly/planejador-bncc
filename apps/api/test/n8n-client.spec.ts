import { N8nResponseSchema } from '../src/ai/dto/n8n-integration.dto';
import { N8nMockAdapter } from '../src/ai/n8n-mock.adapter';
import { GatewayTimeoutException, BadGatewayException } from '@nestjs/common';

describe('N8n Client & Mock Unit Tests (Fase B)', () => {
  let mockAdapter: N8nMockAdapter;

  beforeEach(() => {
    mockAdapter = new N8nMockAdapter();
  });

  describe('N8nResponseSchema (Validação Zod)', () => {
    it('1. Deve validar com sucesso um payload aderente ao contrato oficial', () => {
      const validPayload = {
        success: true,
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01 — Organizar objetos físicos ou digitais...',
        answer: '# Plano de aula\nConteúdo completo do rascunho com mais de 10 caracteres...',
        format: 'markdown',
      };

      const result = N8nResponseSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.format).toBe('markdown');
      }
    });

    it('2. Deve rejeitar payload quando success for false', () => {
      const invalidPayload = {
        success: false,
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01',
        answer: 'Conteúdo qualquer longo...',
        format: 'markdown',
      };

      const result = N8nResponseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('3. Deve rejeitar payload quando o campo answer tiver menos de 10 caracteres', () => {
      const invalidPayload = {
        success: true,
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01',
        answer: 'curto',
        format: 'markdown',
      };

      const result = N8nResponseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('4. Deve rejeitar payload quando o formato não for markdown', () => {
      const invalidPayload = {
        success: true,
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01',
        answer: '# Plano de aula pedagógico estruturado',
        format: 'html',
      };

      const result = N8nResponseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('N8nMockAdapter', () => {
    it('5. Deve gerar plano estruturado compatível com o schema do contrato', async () => {
      const requestPayload = {
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01 — Organizar objetos físicos ou digitais',
        instrucao: 'Criar uma dinâmica prática em duplas.',
        duracao: 50,
        recursos_digitais: false,
      };

      const response = await mockAdapter.generate(requestPayload, { delayMs: 10 });
      expect(response.success).toBe(true);
      expect(response.format).toBe('markdown');
      expect(response.answer).toContain('Plano de Aula:');
      expect(response.answer).toContain('Desenvolvimento Metodológico');
      expect(response.answer).toContain('50 minutos');

      // Validar contra o schema Zod
      expect(() => N8nResponseSchema.parse(response)).not.toThrow();
    });

    it('6. Deve lançar GatewayTimeoutException quando forçado timeout', async () => {
      const requestPayload = {
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01',
        instrucao: 'Teste com __FORCE_TIMEOUT__',
        duracao: 50,
        recursos_digitais: false,
      };

      await expect(
        mockAdapter.generate(requestPayload, { delayMs: 10 }),
      ).rejects.toThrow(GatewayTimeoutException);
    });

    it('7. Deve lançar BadGatewayException quando forçado erro de serviço', async () => {
      const requestPayload = {
        sessao: 'ana@demo.bncc.br',
        habilidade: 'EF01CO01',
        instrucao: 'Teste com __FORCE_SERVICE_ERROR__',
        duracao: 50,
        recursos_digitais: false,
      };

      await expect(
        mockAdapter.generate(requestPayload, { delayMs: 10 }),
      ).rejects.toThrow(BadGatewayException);
    });
  });
});
