import { StatusChamado } from '../generated/prisma/client.js';

// Regra 14: caminhos permitidos entre as situações do chamado.
export const TRANSICOES_PERMITIDAS: Record<StatusChamado, StatusChamado[]> = {
  [StatusChamado.ABERTO]: [
    StatusChamado.EM_ATENDIMENTO,
    StatusChamado.CANCELADO,
  ],
  [StatusChamado.EM_ATENDIMENTO]: [
    StatusChamado.RESOLVIDO,
    StatusChamado.CANCELADO,
  ],
  [StatusChamado.RESOLVIDO]: [
    StatusChamado.FECHADO,
    StatusChamado.EM_ATENDIMENTO,
  ],
  [StatusChamado.FECHADO]: [],
  [StatusChamado.CANCELADO]: [],
};

// Regra 15: chamado fechado ou cancelado está encerrado.
export function chamadoEncerrado(status: StatusChamado): boolean {
  return (
    status === StatusChamado.FECHADO || status === StatusChamado.CANCELADO
  );
}

export function transicaoPermitida(
  de: StatusChamado,
  para: StatusChamado,
): boolean {
  return TRANSICOES_PERMITIDAS[de].includes(para);
}

// Regra 17: limite de chamados simultâneos em atendimento por técnico.
export const LIMITE_ATENDIMENTOS_POR_TECNICO = 5;
