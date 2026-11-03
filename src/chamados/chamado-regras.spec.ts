import { describe, expect, it } from 'vitest';
import { StatusChamado as S } from '../generated/prisma/client.js';
import { chamadoEncerrado, transicaoPermitida } from './chamado-regras.js';

describe('Regras de situação do chamado (regras 14 e 15)', () => {
  const permitidas: [S, S][] = [
    [S.ABERTO, S.EM_ATENDIMENTO],
    [S.EM_ATENDIMENTO, S.RESOLVIDO],
    [S.RESOLVIDO, S.FECHADO],
    [S.RESOLVIDO, S.EM_ATENDIMENTO],
    [S.ABERTO, S.CANCELADO],
    [S.EM_ATENDIMENTO, S.CANCELADO],
  ];

  it.each(permitidas)('permite %s -> %s', (de, para) => {
    expect(transicaoPermitida(de, para)).toBe(true);
  });

  it('proíbe todo o resto (e saída de estados encerrados)', () => {
    const todos = Object.values(S);
    for (const de of todos) {
      for (const para of todos) {
        const esperado = permitidas.some(([a, b]) => a === de && b === para);
        expect(transicaoPermitida(de, para), `${de} -> ${para}`).toBe(esperado);
      }
    }
  });

  it('fechado e cancelado estão encerrados', () => {
    expect(chamadoEncerrado(S.FECHADO)).toBe(true);
    expect(chamadoEncerrado(S.CANCELADO)).toBe(true);
    expect(chamadoEncerrado(S.RESOLVIDO)).toBe(false);
  });
});
