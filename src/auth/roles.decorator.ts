import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type PerfilPermitido = 'SOLICITANTE' | 'TECNICO';

export const Roles = (...roles: PerfilPermitido[]) =>
  SetMetadata(ROLES_KEY, roles);
