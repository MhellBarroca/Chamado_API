import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusChamado } from '../../generated/prisma/client.js';

export class AlterarStatusDto {
  @IsEnum(StatusChamado)
  status!: StatusChamado;

  @IsOptional()
  @IsString()
  motivoCancelamento?: string;
}
