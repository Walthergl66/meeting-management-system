import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ example: 'Texto de la nota...' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class UpdateNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
