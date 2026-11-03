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
  @MinLength(5, { message: 'O título deve ter no mínimo 5 caracteres.' })
  @MaxLength(100, { message: 'O título deve ter no máximo 100 caracteres.' })
  titulo!: string;

  @IsString()
  @MinLength(10, {
    message: 'A descrição deve ter no mínimo 10 caracteres.',
  })
  descricao!: string;

  @IsOptional()
  @IsEnum(PrioridadeChamado)
  prioridade?: PrioridadeChamado;

  @IsInt()
  tipoProblemaId!: number;
}
