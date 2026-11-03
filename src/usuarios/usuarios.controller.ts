import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { UsuariosService } from './usuarios.service.js';
import { CriarUsuarioDto } from './dto/criar-usuario.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { PerfilUsuario } from '../generated/prisma/client.js';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // POST /usuarios  (cadastro público: sempre cria um SOLICITANTE)
  @Post()
  criar(@Body() dto: CriarUsuarioDto) {
    return this.usuariosService.criar(dto, PerfilUsuario.SOLICITANTE);
  }

  // POST /usuarios/tecnicos  (somente técnicos cadastram outros técnicos)
  @Post('tecnicos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  criarTecnico(@Body() dto: CriarUsuarioDto) {
    return this.usuariosService.criar(dto, PerfilUsuario.TECNICO);
  }

  // GET /usuarios
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  listar() {
    return this.usuariosService.listar();
  }

  // PATCH /usuarios/:id/ativar
  @Patch(':id/ativar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  ativar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.ativar(id);
  }

  // PATCH /usuarios/:id/desativar
  @Patch(':id/desativar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.desativar(id);
  }

  // DELETE /usuarios/:id  (bloqueado se já houve envolvimento com chamados)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.remover(id);
  }
}
