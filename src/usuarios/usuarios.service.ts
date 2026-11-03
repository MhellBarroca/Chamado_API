import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CriarUsuarioDto } from './dto/criar-usuario.dto.js';
import { PerfilUsuario } from '../generated/prisma/client.js';
import * as bcrypt from 'bcryptjs';

const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  criadoEm: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  // Regras 1 e 2: e-mail único/válido e perfil SOLICITANTE ou TECNICO.
  async criar(
    dto: CriarUsuarioDto,
    perfil: PerfilUsuario = PerfilUsuario.SOLICITANTE,
  ) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (existente) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com esse e-mail.',
      );
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    return this.prisma.usuario.create({
      data: { nome: dto.nome, email: dto.email, senhaHash, perfil },
      select: CAMPOS_PUBLICOS,
    });
  }

  async listar() {
    return this.prisma.usuario.findMany({
      select: CAMPOS_PUBLICOS,
      orderBy: { id: 'asc' },
    });
  }

  async ativar(id: number) {
    await this.buscarOuFalhar(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: true },
      select: CAMPOS_PUBLICOS,
    });
  }

  // Regras 3 e 4: pessoa inativa não abre, não é designada e não comenta.
  async desativar(id: number) {
    await this.buscarOuFalhar(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: false },
      select: CAMPOS_PUBLICOS,
    });
  }

  // Regra 4: quem já esteve envolvido com algum chamado só pode ser desativado.
  async remover(id: number) {
    await this.buscarOuFalhar(id);

    const [abertos, atendidos, comentarios, historicos] = await Promise.all([
      this.prisma.chamado.count({ where: { solicitanteId: id } }),
      this.prisma.chamado.count({ where: { tecnicoId: id } }),
      this.prisma.comentario.count({ where: { autorId: id } }),
      this.prisma.historicoChamado.count({ where: { usuarioId: id } }),
    ]);

    if (abertos + atendidos + comentarios + historicos > 0) {
      throw new ConflictException(
        'Este usuário já esteve envolvido em chamados e não pode ser removido. Desative-o.',
      );
    }

    await this.prisma.usuario.delete({ where: { id } });
    return { removido: true };
  }

  private async buscarOuFalhar(id: number) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return usuario;
  }
}
