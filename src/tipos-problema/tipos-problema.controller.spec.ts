
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TiposProblemaController } from './tipos-problema.controller.js';
import { TiposProblemaService } from './tipos-problema.service.js';

describe('TiposProblemaController', () => {
  let controller: TiposProblemaController;

  const tiposProblemaServiceMock = {
    criar: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    atualizar: vi.fn(),
    desativar: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TiposProblemaController],
      providers: [
        {
          provide: TiposProblemaService,
          useValue: tiposProblemaServiceMock,
        },
      ],
    }).compile();

    controller = module.get<TiposProblemaController>(
      TiposProblemaController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
