import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChamadosService } from './chamados.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PerfilUsuario,
  StatusChamado,
} from '../generated/prisma/client.js';

describe('ChamadosService', () => {
  let service: ChamadosService;

  const prismaMock: any = {
    chamado: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    usuario: { findUnique: vi.fn() },
    tipoProblema: { findUnique: vi.fn() },
    comentario: { create: vi.fn() },
    historicoChamado: { create: vi.fn() },
    $queryRaw: vi.fn(),
  };
  prismaMock.$transaction = (fn: any) => fn(prismaMock);

  const tecnico = { id: 10, perfil: PerfilUsuario.TECNICO, ativo: true };
  const logadoTecnico = { id: 10, email: 't@x.com', perfil: 'TECNICO' };
  const logadoSolic = { id: 1, email: 's@x.com', perfil: 'SOLICITANTE' };
  const chamadoAberto = {
    id: 1,
    status: StatusChamado.ABERTO,
    solicitanteId: 1,
    tecnicoId: null,
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prismaMock.chamado.update.mockImplementation(async ({ data }: any) => data);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChamadosService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(ChamadosService);
  });

  describe('criar (regras 6, 8, 9, 11)', () => {
    const dto = { titulo: 'Rede caiu', descricao: 'A rede caiu ontem', tipoProblemaId: 1 };

    it('rejeita solicitante inativo', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 1, ativo: false, perfil: 'SOLICITANTE' });
      await expect(service.criar(dto, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejeita técnico abrindo chamado', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 10, ativo: true, perfil: 'TECNICO' });
      await expect(service.criar(dto, 10)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejeita tipo de problema desativado', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 1, ativo: true, perfil: 'SOLICITANTE' });
      prismaMock.tipoProblema.findUnique.mockResolvedValue({ id: 1, ativo: false });
      await expect(service.criar(dto, 1)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cria ABERTO, sem técnico e prioridade MEDIA por padrão', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 1, ativo: true, perfil: 'SOLICITANTE' });
      prismaMock.tipoProblema.findUnique.mockResolvedValue({ id: 1, ativo: true });
      prismaMock.chamado.create.mockResolvedValue({ id: 99 });
      await service.criar(dto, 1);
      const { data } = prismaMock.chamado.create.mock.calls[0][0];
      expect(data.status).toBe('ABERTO');
      expect(data.tecnicoId).toBeNull();
      expect(data.prioridade).toBe('MEDIA');
    });
  });

  describe('designarTecnico (regras 3, 12, 13, 17, 18)', () => {
    it('designa e inicia o atendimento automaticamente', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(chamadoAberto);
      prismaMock.usuario.findUnique.mockResolvedValue(tecnico);
      prismaMock.chamado.count.mockResolvedValue(0);
      const r: any = await service.designarTecnico(1, 10, logadoTecnico);
      expect(r.status).toBe('EM_ATENDIMENTO');
      expect(r.tecnicoId).toBe(10);
    });

    it('rejeita técnico inativo', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(chamadoAberto);
      prismaMock.usuario.findUnique.mockResolvedValue({ ...tecnico, ativo: false });
      await expect(service.designarTecnico(1, 10, logadoTecnico)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejeita quem não é técnico', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(chamadoAberto);
      prismaMock.usuario.findUnique.mockResolvedValue({ id: 5, ativo: true, perfil: 'SOLICITANTE' });
      await expect(service.designarTecnico(1, 5, logadoTecnico)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejeita atender o próprio chamado', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue({ ...chamadoAberto, solicitanteId: 10 });
      prismaMock.usuario.findUnique.mockResolvedValue(tecnico);
      await expect(service.designarTecnico(1, 10, logadoTecnico)).rejects.toThrow(/próprio chamado/);
    });

    it('rejeita o 6º chamado em atendimento', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(chamadoAberto);
      prismaMock.usuario.findUnique.mockResolvedValue(tecnico);
      prismaMock.chamado.count.mockResolvedValue(5);
      await expect(service.designarTecnico(1, 10, logadoTecnico)).rejects.toThrow(/5 chamados/);
    });

    it('aceita o 5º chamado em atendimento', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(chamadoAberto);
      prismaMock.usuario.findUnique.mockResolvedValue(tecnico);
      prismaMock.chamado.count.mockResolvedValue(4);
      await expect(service.designarTecnico(1, 10, logadoTecnico)).resolves.toBeDefined();
    });

    it.each([StatusChamado.FECHADO, StatusChamado.CANCELADO])('rejeita chamado %s', async (status) => {
      prismaMock.chamado.findUnique.mockResolvedValue({ ...chamadoAberto, status });
      await expect(service.designarTecnico(1, 10, logadoTecnico)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('alterarStatus (regras 14, 15, 16, 17)', () => {
    const emAtendimento = { ...chamadoAberto, status: StatusChamado.EM_ATENDIMENTO, tecnicoId: 10 };

    it('registra resolvidoEm ao resolver', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(emAtendimento);
      const r: any = await service.alterarStatus(1, { status: StatusChamado.RESOLVIDO }, logadoTecnico);
      expect(r.resolvidoEm).toBeInstanceOf(Date);
    });

    it('só o técnico responsável resolve', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(emAtendimento);
      await expect(service.alterarStatus(1, { status: StatusChamado.RESOLVIDO }, logadoSolic)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('proíbe ABERTO -> RESOLVIDO', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(chamadoAberto);
      await expect(service.alterarStatus(1, { status: StatusChamado.RESOLVIDO }, logadoSolic)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('proíbe iniciar atendimento sem designar técnico', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(chamadoAberto);
      await expect(service.alterarStatus(1, { status: StatusChamado.EM_ATENDIMENTO }, logadoSolic)).rejects.toThrow(/designe um técnico/);
    });

    it('proíbe alterar chamado fechado', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue({ ...emAtendimento, status: StatusChamado.FECHADO });
      await expect(service.alterarStatus(1, { status: StatusChamado.EM_ATENDIMENTO }, logadoSolic)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reabrir (RESOLVIDO -> EM_ATENDIMENTO) respeita o limite de 5', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue({ ...emAtendimento, status: StatusChamado.RESOLVIDO });
      prismaMock.chamado.count.mockResolvedValue(5);
      await expect(service.alterarStatus(1, { status: StatusChamado.EM_ATENDIMENTO }, logadoSolic)).rejects.toThrow(/5 chamados/);
    });

    it('terceiros não alteram o chamado', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(emAtendimento);
      await expect(service.alterarStatus(1, { status: StatusChamado.CANCELADO }, { id: 77, email: 'x', perfil: 'SOLICITANTE' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('comentar (regras 3, 15, 19, 20)', () => {
    const emAtendimento = { ...chamadoAberto, status: StatusChamado.EM_ATENDIMENTO, tecnicoId: 10 };

    it('solicitante e técnico responsável podem comentar', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(emAtendimento);
      prismaMock.usuario.findUnique.mockResolvedValue({ ativo: true });
      prismaMock.comentario.create.mockResolvedValue({ id: 1 });
      await expect(service.comentar(1, { conteudo: 'ok' }, logadoSolic)).resolves.toBeDefined();
      await expect(service.comentar(1, { conteudo: 'ok' }, logadoTecnico)).resolves.toBeDefined();
    });

    it('outro técnico não pode comentar', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(emAtendimento);
      prismaMock.usuario.findUnique.mockResolvedValue({ ativo: true });
      await expect(service.comentar(1, { conteudo: 'oi' }, { id: 11, email: 'o', perfil: 'TECNICO' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('usuário inativo não comenta', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(emAtendimento);
      prismaMock.usuario.findUnique.mockResolvedValue({ ativo: false });
      await expect(service.comentar(1, { conteudo: 'oi' }, logadoSolic)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('não comenta em chamado encerrado', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue({ ...emAtendimento, status: StatusChamado.CANCELADO });
      prismaMock.usuario.findUnique.mockResolvedValue({ ativo: true });
      await expect(service.comentar(1, { conteudo: 'oi' }, logadoSolic)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('não aceita comentário vazio', async () => {
      prismaMock.chamado.findUnique.mockResolvedValue(emAtendimento);
      prismaMock.usuario.findUnique.mockResolvedValue({ ativo: true });
      await expect(service.comentar(1, { conteudo: '   ' }, logadoSolic)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
