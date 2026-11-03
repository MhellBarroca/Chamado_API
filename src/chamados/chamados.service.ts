import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';
import { AlterarStatusDto } from './dto/alterar-status.dto.js';
import { CriarComentarioDto } from './dto/criar-comentario.dto.js';
import {
  LIMITE_ATENDIMENTOS_POR_TECNICO,
  chamadoEncerrado,
  transicaoPermitida,
} from './chamado-regras.js';

import {
  PerfilUsuario,
  PrioridadeChamado,
  StatusChamado,
} from '../generated/prisma/client.js';

export type UsuarioLogado = {
  id: number;
  email: string;
  perfil: string;
};

export type FiltrosChamado = {
  status?: StatusChamado;
  prioridade?: PrioridadeChamado;
  tecnicoId?: number;
  solicitanteId?: number;
  tipoProblemaId?: number;
};

@Injectable()
export class ChamadosService {
  constructor(private readonly prisma: PrismaService) {}

  // Regras 8, 9, 10, 11 e 6: abre um chamado (nasce ABERTO e sem técnico).
  async criar(dto: CriarChamadoDto, solicitanteId: number) {
    const solicitante = await this.prisma.usuario.findUnique({
      where: { id: solicitanteId },
    });

    if (!solicitante || !solicitante.ativo) {
      throw new BadRequestException('Solicitante não encontrado ou inativo.');
    }

    if (solicitante.perfil !== PerfilUsuario.SOLICITANTE) {
      throw new ForbiddenException(
        'Somente solicitantes podem abrir chamados.',
      );
    }

    const tipo = await this.prisma.tipoProblema.findUnique({
      where: { id: dto.tipoProblemaId },
    });

    if (!tipo || !tipo.ativo) {
      throw new BadRequestException(
        'Tipo de problema não encontrado ou inativo.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const chamado = await tx.chamado.create({
        data: {
          titulo: dto.titulo,
          descricao: dto.descricao,
          prioridade: dto.prioridade ?? PrioridadeChamado.MEDIA,
          status: StatusChamado.ABERTO,
          tecnicoId: null,
          solicitanteId,
          tipoProblemaId: dto.tipoProblemaId,
        },
        include: {
          solicitante: { select: { id: true, nome: true, email: true } },
          tipoProblema: true,
        },
      });

      await tx.historicoChamado.create({
        data: {
          chamadoId: chamado.id,
          usuarioId: solicitanteId,
          acao: 'CHAMADO_CRIADO',
          detalhes: 'Chamado aberto pelo solicitante.',
        },
      });

      return chamado;
    });
  }

  // Solicitante vê só os seus; técnico vê todos (precisa ver a fila para atender).
  async listar(filtros: FiltrosChamado, usuarioLogado: UsuarioLogado) {
    const restricao =
      usuarioLogado.perfil === PerfilUsuario.SOLICITANTE
        ? { solicitanteId: usuarioLogado.id }
        : {};

    return this.prisma.chamado.findMany({
      where: { ...filtros, ...restricao },
      include: {
        solicitante: { select: { id: true, nome: true } },
        tecnico: { select: { id: true, nome: true } },
        tipoProblema: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Chamado com toda a conversa (e o histórico de andamento).
  async buscarPorId(id: number, usuarioLogado: UsuarioLogado) {
    const chamado = await this.prisma.chamado.findUnique({
      where: { id },
      include: {
        solicitante: { select: { id: true, nome: true, email: true } },
        tecnico: { select: { id: true, nome: true, email: true } },
        tipoProblema: true,
        comentarios: {
          orderBy: { criadoEm: 'asc' },
          include: { autor: { select: { id: true, nome: true } } },
        },
        historicos: { orderBy: { criadoEm: 'asc' } },
      },
    });

    if (!chamado) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    const ehTecnico = usuarioLogado.perfil === PerfilUsuario.TECNICO;
    const ehDono = chamado.solicitanteId === usuarioLogado.id;

    if (!ehTecnico && !ehDono) {
      throw new ForbiddenException(
        'Você não tem permissão para consultar este chamado.',
      );
    }

    return chamado;
  }

  // Regra 15: chamado encerrado não pode ser alterado.
  async atualizar(
    id: number,
    dto: AtualizarChamadoDto,
    usuarioLogado: UsuarioLogado,
  ) {
    const chamado = await this.obterChamado(id);

    this.exigirParticipante(chamado, usuarioLogado);

    if (chamadoEncerrado(chamado.status)) {
      throw new BadRequestException(
        'Não é possível alterar um chamado fechado ou cancelado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.chamado.update({
        where: { id },
        data: {
          ...(dto.titulo !== undefined && { titulo: dto.titulo }),
          ...(dto.descricao !== undefined && { descricao: dto.descricao }),
          ...(dto.prioridade !== undefined && { prioridade: dto.prioridade }),
        },
      });

      await tx.historicoChamado.create({
        data: {
          chamadoId: id,
          usuarioId: usuarioLogado.id,
          acao: 'CHAMADO_ATUALIZADO',
          detalhes: JSON.stringify(dto),
        },
      });

      return atualizado;
    });
  }

  // Regras 3, 12, 13, 15, 17 e 18: designa técnico e inicia o atendimento.
  async designarTecnico(
    id: number,
    tecnicoId: number,
    usuarioLogado: UsuarioLogado,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const chamado = await tx.chamado.findUnique({ where: { id } });

      if (!chamado) {
        throw new NotFoundException('Chamado não encontrado.');
      }

      if (chamadoEncerrado(chamado.status)) {
        throw new BadRequestException(
          'Não é possível alterar um chamado fechado ou cancelado.',
        );
      }

      if (
        chamado.status !== StatusChamado.ABERTO &&
        chamado.status !== StatusChamado.EM_ATENDIMENTO
      ) {
        throw new BadRequestException(
          'Só é possível designar técnico em chamado aberto ou em atendimento.',
        );
      }

      const tecnico = await tx.usuario.findUnique({
        where: { id: tecnicoId },
      });

      if (!tecnico || tecnico.perfil !== PerfilUsuario.TECNICO) {
        throw new BadRequestException('Técnico não encontrado.');
      }

      if (!tecnico.ativo) {
        throw new BadRequestException('O técnico informado está inativo.');
      }

      if (tecnico.id === chamado.solicitanteId) {
        throw new BadRequestException(
          'Ninguém pode atender o próprio chamado.',
        );
      }

      if (chamado.tecnicoId === tecnico.id) {
        throw new BadRequestException(
          'Este técnico já é o responsável pelo chamado.',
        );
      }

      await this.validarLimiteDeAtendimentos(tx, tecnico.id);

      const atualizado = await tx.chamado.update({
        where: { id },
        data: {
          tecnicoId: tecnico.id,
          status: StatusChamado.EM_ATENDIMENTO,
        },
      });

      await tx.historicoChamado.create({
        data: {
          chamadoId: id,
          usuarioId: usuarioLogado.id,
          acao: 'TECNICO_DESIGNADO',
          detalhes: JSON.stringify({
            tecnicoAnterior: chamado.tecnicoId,
            tecnicoNovo: tecnico.id,
            statusAnterior: chamado.status,
          }),
        },
      });

      return atualizado;
    });
  }

  // Regras 14, 15, 16 e 17: muda a situação respeitando o fluxo permitido.
  async alterarStatus(
    id: number,
    dto: AlterarStatusDto,
    usuarioLogado: UsuarioLogado,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const chamado = await tx.chamado.findUnique({ where: { id } });

      if (!chamado) {
        throw new NotFoundException('Chamado não encontrado.');
      }

      if (chamadoEncerrado(chamado.status)) {
        throw new BadRequestException(
          'Não é possível alterar um chamado fechado ou cancelado.',
        );
      }

      this.exigirParticipante(chamado, usuarioLogado);

      const de = chamado.status;
      const para = dto.status;

      if (!transicaoPermitida(de, para)) {
        throw new BadRequestException(
          `Transição de ${de} para ${para} não é permitida.`,
        );
      }

      // Regra 13: o atendimento só começa pela designação de um técnico.
      if (de === StatusChamado.ABERTO && para === StatusChamado.EM_ATENDIMENTO) {
        throw new BadRequestException(
          'Para iniciar o atendimento, designe um técnico ao chamado.',
        );
      }

      // Somente o técnico responsável marca o chamado como resolvido.
      if (
        para === StatusChamado.RESOLVIDO &&
        chamado.tecnicoId !== usuarioLogado.id
      ) {
        throw new ForbiddenException(
          'Somente o técnico responsável pode resolver o chamado.',
        );
      }

      // Regra 17: reabrir devolve o chamado ao técnico, que não pode estourar o limite.
      if (de === StatusChamado.RESOLVIDO && para === StatusChamado.EM_ATENDIMENTO) {
        if (chamado.tecnicoId === null) {
          throw new BadRequestException('Chamado sem técnico responsável.');
        }
        await this.validarLimiteDeAtendimentos(tx, chamado.tecnicoId);
      }

      const agora = new Date();

      const atualizado = await tx.chamado.update({
        where: { id },
        data: {
          status: para,
          ...(para === StatusChamado.RESOLVIDO && { resolvidoEm: agora }),
          ...(para === StatusChamado.EM_ATENDIMENTO && { resolvidoEm: null }),
          ...(para === StatusChamado.FECHADO && { fechadoEm: agora }),
          ...(para === StatusChamado.CANCELADO &&
            dto.motivoCancelamento !== undefined && {
              motivoCancelamento: dto.motivoCancelamento,
            }),
        },
      });

      await tx.historicoChamado.create({
        data: {
          chamadoId: id,
          usuarioId: usuarioLogado.id,
          acao: 'STATUS_ALTERADO',
          detalhes: JSON.stringify({ de, para, em: agora.toISOString() }),
        },
      });

      return atualizado;
    });
  }

  // Regras 3, 15, 19, 20 e 21: registra um comentário (nunca editado/apagado).
  async comentar(
    chamadoId: number,
    dto: CriarComentarioDto,
    usuarioLogado: UsuarioLogado,
  ) {
    const chamado = await this.obterChamado(chamadoId);

    const autor = await this.prisma.usuario.findUnique({
      where: { id: usuarioLogado.id },
    });

    if (!autor || !autor.ativo) {
      throw new ForbiddenException('Usuário inativo não pode comentar.');
    }

    if (chamadoEncerrado(chamado.status)) {
      throw new BadRequestException(
        'Chamados fechados ou cancelados não recebem comentários.',
      );
    }

    this.exigirParticipante(chamado, usuarioLogado);

    const conteudo = dto.conteudo?.trim();

    if (!conteudo) {
      throw new BadRequestException('O comentário não pode ser vazio.');
    }

    return this.prisma.comentario.create({
      data: { conteudo, chamadoId, autorId: usuarioLogado.id },
      include: { autor: { select: { id: true, nome: true } } },
    });
  }

  // ---------- auxiliares ----------

  private async obterChamado(id: number) {
    const chamado = await this.prisma.chamado.findUnique({ where: { id } });

    if (!chamado) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    return chamado;
  }

  // Participantes: quem abriu o chamado e o técnico responsável (regra 19).
  private exigirParticipante(
    chamado: { solicitanteId: number; tecnicoId: number | null },
    usuario: UsuarioLogado,
  ) {
    const ehSolicitante = chamado.solicitanteId === usuario.id;
    const ehTecnicoResponsavel = chamado.tecnicoId === usuario.id;

    if (!ehSolicitante && !ehTecnicoResponsavel) {
      throw new ForbiddenException(
        'Somente quem abriu o chamado e o técnico responsável podem realizar esta operação.',
      );
    }
  }

  // Regra 17: no máximo 5 chamados EM_ATENDIMENTO por técnico.
  // O SELECT ... FOR UPDATE serializa designações simultâneas para o mesmo técnico.
  private async validarLimiteDeAtendimentos(
    tx: Pick<PrismaService, 'chamado' | '$queryRaw'>,
    tecnicoId: number,
  ) {
    await tx.$queryRaw`SELECT id FROM Usuario WHERE id = ${tecnicoId} FOR UPDATE`;

    const emAtendimento = await tx.chamado.count({
      where: { tecnicoId, status: StatusChamado.EM_ATENDIMENTO },
    });

    if (emAtendimento >= LIMITE_ATENDIMENTOS_POR_TECNICO) {
      throw new BadRequestException(
        `O técnico já possui ${LIMITE_ATENDIMENTOS_POR_TECNICO} chamados em atendimento.`,
      );
    }
  }
}
