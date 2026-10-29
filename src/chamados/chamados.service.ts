
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CriarChamadoDto } from './dto/criar-chamado.dto.js';
import { AtualizarChamadoDto } from './dto/atualizar-chamado.dto.js';

import {
  PerfilUsuario,
  PrioridadeChamado,
  StatusChamado,
} from '../generated/prisma/client.js';

type UsuarioLogado = {
  id: number;
  email: string;
  perfil: string;
};

type FiltrosChamado = {
  status?: StatusChamado;
  prioridade?: PrioridadeChamado;
  tecnicoId?: number;
  solicitanteId?: number;
  tipoProblemaId?: number;
};

@Injectable()
export class ChamadosService {
  constructor(private readonly prisma: PrismaService) {}

  // Cadastra um chamado usando o ID do usuário autenticado.
  async criar(dto: CriarChamadoDto, solicitanteId: number) {
    const solicitante = await this.prisma.usuario.findUnique({
      where: { id: solicitanteId },
    });

    if (!solicitante || !solicitante.ativo) {
      throw new BadRequestException(
        'Solicitante não encontrado ou inativo.',
      );
    }

    if (
      solicitante.perfil !== PerfilUsuario.SOLICITANTE &&
      solicitante.perfil !== PerfilUsuario.ADMIN
    ) {
      throw new ForbiddenException(
        'Este perfil não pode abrir chamados.',
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
          solicitanteId,
          tipoProblemaId: dto.tipoProblemaId,
        },
        include: {
          solicitante: {
            select: { id: true, nome: true, email: true },
          },
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

  // Lista chamados respeitando o perfil do usuário autenticado.
  async listar(
    filtros: FiltrosChamado,
    usuarioLogado: UsuarioLogado,
  ) {
    let restricaoPerfil: { solicitanteId?: number; tecnicoId?: number } = {};

    if (usuarioLogado.perfil === PerfilUsuario.SOLICITANTE) {
      restricaoPerfil = { solicitanteId: usuarioLogado.id };
    } else if (usuarioLogado.perfil === PerfilUsuario.TECNICO) {
      restricaoPerfil = { tecnicoId: usuarioLogado.id };
    } else if (usuarioLogado.perfil !== PerfilUsuario.ADMIN) {
      throw new ForbiddenException(
        'Você não tem permissão para consultar chamados.',
      );
    }

    return this.prisma.chamado.findMany({
      where: {
        ...filtros,
        ...restricaoPerfil,
      },
      include: {
        solicitante: {
          select: { id: true, nome: true },
        },
        tecnico: {
          select: { id: true, nome: true },
        },
        tipoProblema: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Busca um chamado e verifica se o usuário pode consultá-lo.
  async buscarPorId(id: number, usuarioLogado: UsuarioLogado) {
    const chamado = await this.prisma.chamado.findUnique({
      where: { id },
      include: {
        solicitante: {
          select: { id: true, nome: true, email: true },
        },
        tecnico: {
          select: { id: true, nome: true, email: true },
        },
        tipoProblema: true,
        comentarios: {
          orderBy: { criadoEm: 'asc' },
        },
        historicos: {
          orderBy: { criadoEm: 'asc' },
        },
      },
    });

    if (!chamado) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    const ehAdmin =
      usuarioLogado.perfil === PerfilUsuario.ADMIN;

    const ehSolicitante =
      usuarioLogado.perfil === PerfilUsuario.SOLICITANTE &&
      chamado.solicitanteId === usuarioLogado.id;

    const ehTecnicoResponsavel =
      usuarioLogado.perfil === PerfilUsuario.TECNICO &&
      chamado.tecnicoId === usuarioLogado.id;

    if (!ehAdmin && !ehSolicitante && !ehTecnicoResponsavel) {
      throw new ForbiddenException(
        'Você não tem permissão para consultar este chamado.',
      );
    }

    return chamado;
  }

  // Atualiza um chamado e registra o usuário responsável pela operação.
  async atualizar(
    id: number,
    dto: AtualizarChamadoDto,
    usuarioLogado: UsuarioLogado,
  ) {
    // Primeiro, localiza o chamado sem expor seus dados ao cliente.
    const chamadoAtual = await this.prisma.chamado.findUnique({
      where: { id },
    });

    if (!chamadoAtual) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    const ehAdmin =
      usuarioLogado.perfil === PerfilUsuario.ADMIN;

    const ehTecnicoResponsavel =
      usuarioLogado.perfil === PerfilUsuario.TECNICO &&
      chamadoAtual.tecnicoId === usuarioLogado.id;

    if (!ehAdmin && !ehTecnicoResponsavel) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar este chamado.',
      );
    }

    // Técnico não pode transferir o chamado para outra pessoa.
    if (
      !ehAdmin &&
      dto.tecnicoId !== undefined &&
      dto.tecnicoId !== usuarioLogado.id
    ) {
      throw new ForbiddenException(
        'Somente o administrador pode alterar o técnico responsável.',
      );
    }

    if (dto.tecnicoId !== undefined && dto.tecnicoId !== null) {
      const tecnico = await this.prisma.usuario.findUnique({
        where: { id: dto.tecnicoId },
      });

      if (
        !tecnico ||
        !tecnico.ativo ||
        (
          tecnico.perfil !== PerfilUsuario.TECNICO &&
          tecnico.perfil !== PerfilUsuario.ADMIN
        )
      ) {
        throw new BadRequestException(
          'Técnico não encontrado, inativo ou sem perfil autorizado.',
        );
      }
    }

    if (
      dto.status === StatusChamado.CANCELADO &&
      !dto.motivoCancelamento?.trim()
    ) {
      throw new BadRequestException(
        'Informe o motivo do cancelamento.',
      );
    }

    if (
      chamadoAtual.status === StatusChamado.FECHADO ||
      chamadoAtual.status === StatusChamado.CANCELADO
    ) {
      throw new BadRequestException(
        'Não é possível alterar um chamado fechado ou cancelado.',
      );
    }

    const dados = {
      ...(dto.titulo !== undefined && { titulo: dto.titulo }),
      ...(dto.descricao !== undefined && { descricao: dto.descricao }),
      ...(dto.prioridade !== undefined && {
        prioridade: dto.prioridade,
      }),
      ...(dto.tecnicoId !== undefined && {
        tecnicoId: dto.tecnicoId,
      }),
      ...(dto.motivoCancelamento !== undefined && {
        motivoCancelamento: dto.motivoCancelamento,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.status === StatusChamado.RESOLVIDO && {
        resolvidoEm: new Date(),
      }),
      ...(dto.status === StatusChamado.FECHADO && {
        fechadoEm: new Date(),
      }),
    };

    return this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.chamado.update({
        where: { id },
        data: dados,
      });

      // Registra quem realizou a alteração.
      await tx.historicoChamado.create({
        data: {
          chamadoId: id,
          usuarioId: usuarioLogado.id,
          acao: 'CHAMADO_ATUALIZADO',
          detalhes: JSON.stringify({
            antes: {
              status: chamadoAtual.status,
              prioridade: chamadoAtual.prioridade,
              tecnicoId: chamadoAtual.tecnicoId,
            },
            alteracoes: dto,
          }),
        },
      });

      return atualizado;
    });
  }
}
