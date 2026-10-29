
import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CriarUsuarioDto } from './dto/criar-usuario.dto.js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  // Cadastra um novo usuário.
  async criar(dto: CriarUsuarioDto) {
    // 1. Verifica se o e-mail já está cadastrado.
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com esse e-mail.',
      );
    }

    // 2. Criptografa a senha antes de salvar.
    const senhaHash = await bcrypt.hash(dto.senha, 10);

    // 3. Salva o usuário no banco de dados.
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
      },
    });

    // 4. Retorna os dados sem a senha.
    return usuario;
  }

  // Lista os usuários cadastrados.
  async listar() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        criadoEm: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }
}
