
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PrioridadeChamado } from '../../generated/prisma/client.js';

export class CriarChamadoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  titulo!: string;

  @IsString()
  @MinLength(5)
  descricao!: string;

  @IsOptional()
  @IsEnum(PrioridadeChamado)
  prioridade?: PrioridadeChamado;

  @IsInt()
  tipoProblemaId!: number;
}
