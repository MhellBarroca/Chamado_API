import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class CriarComentarioDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O comentário deve ser um texto.' })
  @IsNotEmpty({ message: 'O comentário não pode ser vazio.' })
  conteudo!: string;
}
