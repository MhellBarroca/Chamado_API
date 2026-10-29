
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChamadosController } from './chamados.controller.js';
import { ChamadosService } from './chamados.service.js';

describe('ChamadosController', () => {
  let controller: ChamadosController;

  const chamadosServiceMock = {
    criar: vi.fn(),
    listar: vi.fn(),
    buscarPorId: vi.fn(),
    atualizar: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChamadosController],
      providers: [
        {
          provide: ChamadosService,
          useValue: chamadosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ChamadosController>(ChamadosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
