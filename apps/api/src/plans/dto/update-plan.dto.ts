import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePlanDto {
  @IsString({ message: 'O título do plano deve ser um texto.' })
  @IsNotEmpty({ message: 'O título do plano não pode ficar em branco.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  titulo: string;

  @IsString({ message: 'O conteúdo do plano deve ser um texto.' })
  @IsNotEmpty({ message: 'O conteúdo em Markdown do plano não pode ficar em branco.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  markdownContent: string;
}
