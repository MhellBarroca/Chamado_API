
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TiposProblemaService } from './tipos-problema.service.js';
import { TiposProblemaController } from './tipos-problema.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [TiposProblemaController],
  providers: [TiposProblemaService],
})
export class TiposProblemaModule {}
