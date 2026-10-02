import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetHabilidadesQueryDto } from './dto/get-habilidades-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BnccService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GetHabilidadesQueryDto) {
    const where: Prisma.HabilidadeWhereInput = {};

    if (query.nivel) {
      where.nivel = query.nivel;
    }

    if (query.ano !== undefined && query.ano !== null && !isNaN(Number(query.ano))) {
      where.ano = Number(query.ano);
    }

    if (query.eixo) {
      where.eixo = query.eixo;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.OR = [
        { codigo: { contains: searchTerm, mode: 'insensitive' } },
        { descricao: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.habilidade.count({ where }),
      this.prisma.habilidade.findMany({
        where,
        orderBy: [{ ano: 'asc' }, { codigo: 'asc' }],
      }),
    ]);

    return { total, data };
  }

  async findById(idOrCodigo: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrCodigo);
    const where: Prisma.HabilidadeWhereInput = isUuid
      ? { OR: [{ id: idOrCodigo }, { codigo: idOrCodigo }] }
      : { codigo: idOrCodigo };

    const habilidade = await this.prisma.habilidade.findFirst({
      where,
    });

    if (!habilidade) {
      throw new NotFoundException('Habilidade não encontrada no catálogo da BNCC.');
    }

    return habilidade;
  }
}
