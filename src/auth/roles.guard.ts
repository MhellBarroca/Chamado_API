
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PerfilPermitido } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<PerfilPermitido[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se a rota não exigir um perfil específico, continua a verificação.
    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user as { perfil?: string } | undefined;

    if (!usuario || !usuario.perfil || !roles.includes(usuario.perfil as PerfilPermitido)) {
      throw new ForbiddenException(
        'Você não tem permissão para realizar esta operação.',
      );
    }

    return true;
  }
}
