
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TiposProblemaService } from './tipos-problema.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('TiposProblemaService', () => {
  let service: TiposProblemaService;

  const prismaMock = {
    tipoProblema: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiposProblemaService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TiposProblemaService>(TiposProblemaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
