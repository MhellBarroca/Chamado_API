
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PrioridadeChamado,
  StatusChamado,
} from '../../generated/prisma/client.js';

export class AtualizarChamadoDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  descricao?: string;

  @IsOptional()
  @IsEnum(PrioridadeChamado)
  prioridade?: PrioridadeChamado;

  @IsOptional()
  @IsEnum(StatusChamado)
  status?: StatusChamado;

  @IsOptional()
  @IsInt()
  tecnicoId?: number;

  @IsOptional()
  @IsString()
  motivoCancelamento?: string;
}
