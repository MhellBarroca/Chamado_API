
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { TiposProblemaService } from './tipos-problema.service.js';
import { CriarTipoProblemaDto } from './dto/criar-tipo-problema.dto.js';
import { AtualizarTipoProblemaDto } from './dto/atualizar-tipo-problema.dto.js';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tipos-problema')
export class TiposProblemaController {
  constructor(
    private readonly tiposProblemaService: TiposProblemaService,
  ) {}

  // POST /tipos-problema
  // Somente ADMIN pode cadastrar tipos de problema.
  @Post()
  @Roles('ADMIN')
  criar(@Body() dto: CriarTipoProblemaDto) {
    return this.tiposProblemaService.criar(dto);
  }

  // GET /tipos-problema
  // Qualquer usuário autenticado pode consultar.
  @Get()
  listar() {
    return this.tiposProblemaService.listar();
  }

  // GET /tipos-problema/:id
  // Qualquer usuário autenticado pode consultar por ID.
  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.tiposProblemaService.buscarPorId(id);
  }

  // PATCH /tipos-problema/:id
  // Somente ADMIN pode atualizar.
  @Patch(':id')
  @Roles('ADMIN')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarTipoProblemaDto,
  ) {
    return this.tiposProblemaService.atualizar(id, dto);
  }

  // PATCH /tipos-problema/:id/desativar
  // Somente ADMIN pode desativar.
  @Patch(':id/desativar')
  @Roles('ADMIN')
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.tiposProblemaService.desativar(id);
  }
}
