import { z } from 'zod';

export interface N8nGenerateRequestDto {
  sessao: string;
  habilidade: string;
  instrucao: string;
  duracao: number;
  recursos_digitais: boolean;
}

export const N8nResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1, 'O campo sessão é obrigatório.'),
  habilidade: z.string().min(1, 'O campo habilidade é obrigatório.'),
  answer: z.string().min(10, 'O conteúdo do rascunho retornado pelo provedor de IA é insuficiente.'),
  format: z.literal('markdown'),
});

export type N8nGenerateResponseDto = z.infer<typeof N8nResponseSchema>;
