import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GeneratePlanDto {
  @IsArray({ message: 'O campo habilidades deve ser uma lista de identificadores.' })
  @ArrayNotEmpty({ message: 'Informe pelo menos uma habilidade da BNCC.' })
  @IsString({ each: true, message: 'Cada identificador de habilidade deve ser uma cadeia de texto válida.' })
  habilidadeIds: string[];

  @IsInt({ message: 'A duração deve ser um número inteiro de minutos.' })
  @Min(1, { message: 'A duração da aula deve ser maior que zero minutos.' })
  @Type(() => Number)
  duracao: number;

  @IsBoolean({ message: 'O campo recursosDigitais deve ser verdadeiro ou falso.' })
  recursosDigitais: boolean;

  @IsOptional()
  @IsString({ message: 'A instrução pedagógica deve ser um texto.' })
  instrucao?: string;
}
