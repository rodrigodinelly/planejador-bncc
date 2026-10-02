import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BnccService } from './bncc.service';
import { GetHabilidadesQueryDto } from './dto/get-habilidades-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('bncc')
@UseGuards(JwtAuthGuard)
export class BnccController {
  constructor(private readonly bnccService: BnccService) {}

  @Get('habilidades')
  async findAll(@Query() query: GetHabilidadesQueryDto) {
    return this.bnccService.findAll(query);
  }

  @Get('habilidades/:id')
  async findById(@Param('id') id: string) {
    return this.bnccService.findById(id);
  }
}
