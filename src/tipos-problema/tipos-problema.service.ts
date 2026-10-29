
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CriarTipoProblemaDto } from './dto/criar-tipo-problema.dto.js';

@Injectable()
export class TiposProblemaService {
  constructor(private readonly prisma: PrismaService) {}

  // Cadastra um novo tipo de problema.
  async criar(dto: CriarTipoProblemaDto) {
    const existente = await this.prisma.tipoProblema.findUnique({
      where: { nome: dto.nome },
    });

    if (existente) {
      throw new ConflictException(
        'Já existe um tipo de problema com esse nome.',
      );
    }

    return this.prisma.tipoProblema.create({
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        ativo: dto.ativo,
      },
    });
  }

  // Lista todos os tipos de problema.
  async listar() {
    return this.prisma.tipoProblema.findMany({
      orderBy: { id: 'asc' },
    });
  }

  // Busca um tipo de problema pelo ID.
  async buscarPorId(id: number) {
    const tipo = await this.prisma.tipoProblema.findUnique({
      where: { id },
    });

    if (!tipo) {
      throw new NotFoundException('Tipo de problema não encontrado.');
    }

    return tipo;
  }

  // Atualiza um tipo de problema.
  async atualizar(
    id: number,
    dto: Partial<CriarTipoProblemaDto>,
  ) {
    await this.buscarPorId(id);

    if (dto.nome) {
      const existente = await this.prisma.tipoProblema.findUnique({
        where: { nome: dto.nome },
      });

      if (existente && existente.id !== id) {
        throw new ConflictException(
          'Já existe outro tipo de problema com esse nome.',
        );
      }
    }

    return this.prisma.tipoProblema.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        ...(dto.ativo !== undefined && { ativo: dto.ativo }),
      },
    });
  }

  // Desativa sem excluir o registro do banco.
  async desativar(id: number) {
    await this.buscarPorId(id);

    return this.prisma.tipoProblema.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
