
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ChamadosController } from './chamados.controller.js';
import { ChamadosService } from './chamados.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ChamadosController],
  providers: [ChamadosService],
})
export class ChamadosModule {}
