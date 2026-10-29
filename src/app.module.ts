
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { TiposProblemaModule } from './tipos-problema/tipos-problema.module.js';
import { ChamadosModule } from './chamados/chamados.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsuariosModule,
    TiposProblemaModule,
    ChamadosModule,
    AuthModule,
  ],
})
export class AppModule {}
