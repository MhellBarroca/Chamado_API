
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChamadosService } from './chamados.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ChamadosService', () => {
  let service: ChamadosService;

  const prismaMock = {
    chamado: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    historicoChamado: {
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChamadosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ChamadosService>(ChamadosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
