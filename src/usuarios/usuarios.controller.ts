
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { UsuariosService } from './usuarios.service.js';
import { CriarUsuarioDto } from './dto/criar-usuario.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

type RequisicaoAutenticada = Request & {
  user: {
    id: number;
    email: string;
    perfil: string;
  };
};

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
  ) {}

  // POST /usuarios
  // Cadastro público: o serviço cria o usuário como SOLICITANTE.
  @Post()
  criar(@Body() dto: CriarUsuarioDto) {
    return this.usuariosService.criar(dto);
  }

  // GET /usuarios
  // Somente administradores podem listar usuários.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listar(@Req() req: RequisicaoAutenticada) {
    return this.usuariosService.listar();
  }
}
