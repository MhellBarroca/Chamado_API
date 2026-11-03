import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrioridadeChamado } from '../../generated/prisma/client.js';

// Edição dos dados do chamado. Status e técnico têm endpoints próprios.
export class AtualizarChamadoDto {
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'O título deve ter no mínimo 5 caracteres.' })
  @MaxLength(100, { message: 'O título deve ter no máximo 100 caracteres.' })
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, {
    message: 'A descrição deve ter no mínimo 10 caracteres.',
  })
  descricao?: string;

  @IsOptional()
  @IsEnum(PrioridadeChamado)
  prioridade?: PrioridadeChamado;
}
