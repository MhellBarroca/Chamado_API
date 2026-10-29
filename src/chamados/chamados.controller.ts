
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
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

import {
  PrioridadeChamado,
  StatusChamado,
} from '../generated/prisma/client.js';

type UsuarioAutenticado = {
  id: number;
  email: string;
  perfil: string;
};

type RequisicaoAutenticada = Request & {
  user: UsuarioAutenticado;
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chamados')
export class ChamadosController {
  constructor(
    private readonly chamadosService: ChamadosService,
  ) {}

  // POST /chamados
  @Post()
  criar(
    @Body() dto: CriarChamadoDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.criar(dto, req.user.id);
  }

  // GET /chamados
  @Get()
  listar(
    @Req() req: RequisicaoAutenticada,
    @Query('status') status?: string,
    @Query('prioridade') prioridade?: string,
    @Query('tecnicoId') tecnicoId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('tipoProblemaId') tipoProblemaId?: string,
  ) {
    const filtros: {
      status?: StatusChamado;
      prioridade?: PrioridadeChamado;
      tecnicoId?: number;
      solicitanteId?: number;
      tipoProblemaId?: number;
    } = {};

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

    const parametrosNumericos = [
      { nome: 'tecnicoId', valor: tecnicoId },
      { nome: 'solicitanteId', valor: solicitanteId },
      { nome: 'tipoProblemaId', valor: tipoProblemaId },
    ];

    for (const parametro of parametrosNumericos) {
      if (
        parametro.valor !== undefined &&
        !/^[1-9]\d*$/.test(parametro.valor)
      ) {
        throw new BadRequestException(
          `${parametro.nome} deve ser um número inteiro positivo.`,
        );
      }
    }

    if (tecnicoId !== undefined) {
      filtros.tecnicoId = Number(tecnicoId);
    }

    if (solicitanteId !== undefined) {
      filtros.solicitanteId = Number(solicitanteId);
    }

    if (tipoProblemaId !== undefined) {
      filtros.tipoProblemaId = Number(tipoProblemaId);
    }

    return this.chamadosService.listar(filtros, req.user);
  }

  // GET /chamados/:id
  @Get(':id')
  buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.buscarPorId(id, req.user);
  }

  // PATCH /chamados/:id
  @Patch(':id')
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarChamadoDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    return this.chamadosService.atualizar(id, dto, req.user);
  }
}
