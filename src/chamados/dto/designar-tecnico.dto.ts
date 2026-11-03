import { IsInt, IsPositive } from 'class-validator';

export class DesignarTecnicoDto {
  @IsInt()
  @IsPositive()
  tecnicoId!: number;
}
