import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ChamadosService } from './chamados.service.js';
import type { FiltrosChamado, UsuarioLogado } from './chamados.service.js';
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { DesignarTecnicoDto } from './dto/designar-tecnico.dto.js';
import { AlterarStatusDto } from './dto/alterar-status.dto.js';
import { CriarComentarioDto } from './dto/criar-comentario.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

import {
  PrioridadeChamado,
  StatusChamado,
} from '../generated/prisma/client.js';

type RequisicaoAutenticada = Request & { user: UsuarioLogado };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chamados')
export class ChamadosController {
  constructor(private readonly chamadosService: ChamadosService) {}

  // POST /chamados  (somente solicitante; validado no serviço)
  @Post()
  @Roles('SOLICITANTE')
  criar(@Body() dto: CriarChamadoDto, @Req() req: RequisicaoAutenticada) {
    return this.chamadosService.criar(dto, req.user.id);
  }

  // GET /chamados?status=&prioridade=&tipoProblemaId=&tecnicoId=
  @Get()
  listar(
    @Req() req: RequisicaoAutenticada,
    @Query('status') status?: string,
    @Query('prioridade') prioridade?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('tipoProblemaId') tipoProblemaId?: string,
  ) {
    const filtros: FiltrosChamado = {};

    if (status !== undefined) {
      if (!Object.values(StatusChamado).includes(status as StatusChamado)) {
        throw new BadRequestException('Status inválido.');
      }
      filtros.status = status as StatusChamado;
    }

    if (prioridade !== undefined) {
      if (
        !Object.values(PrioridadeChamado).includes(
          prioridade as PrioridadeChamado,
        )
      ) {
        throw new BadRequestException('Prioridade inválida.');
      }
      filtros.prioridade = prioridade as PrioridadeChamado;
    }

    const numericos = [
      { nome: 'tecnicoId', valor: tecnicoId },
      { nome: 'solicitanteId', valor: solicitanteId },
      { nome: 'tipoProblemaId', valor: tipoProblemaId },
    ];

    for (const { nome, valor } of numericos) {
      if (valor !== undefined && !/^[1-9]\d*$/.test(valor)) {
        throw new BadRequestException(
          `${nome} deve ser um número inteiro positivo.`,
        );
      }
    }

    if (tecnicoId !== undefined) filtros.tecnicoId = Number(tecnicoId);
    if (solicitanteId !== undefined) filtros.solicitanteId = Number(solicitanteId);
    if (tipoProblemaId !== undefined) {
      filtros.tipoProblemaId = Number(tipoProblemaId);
    }

    return this.chamadosService.listar(filtros, req.user);
  }

  // GET /chamados/:id  (chamado + comentários + histórico)
  @Get(':id')
  buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.buscarPorId(id, req.user);
  }

  // PATCH /chamados/:id  (título, descrição, prioridade)
  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarChamadoDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.atualizar(id, dto, req.user);
  }

  // PATCH /chamados/:id/designar  { tecnicoId }
  @Patch(':id/designar')
  @Roles('TECNICO')
  designar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DesignarTecnicoDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.designarTecnico(id, dto.tecnicoId, req.user);
  }

  // PATCH /chamados/:id/status  { status, motivoCancelamento? }
  @Patch(':id/status')
  alterarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlterarStatusDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.alterarStatus(id, dto, req.user);
  }

  // POST /chamados/:id/comentarios  { conteudo }
  // Não existe PATCH/DELETE de comentário: o histórico é imutável (regra 21).
  @Post(':id/comentarios')
  comentar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CriarComentarioDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.comentar(id, dto, req.user);
  }
}
