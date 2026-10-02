import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetHabilidadesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  nivel?: string;

  @IsOptional()
  @Type(() => Number)
  ano?: number;

  @IsOptional()
  @IsString()
  eixo?: string;
}
