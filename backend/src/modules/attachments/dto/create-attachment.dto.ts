import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAttachmentDto {
  @ApiPropertyOptional({ description: 'ID de la reunión' })
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional({ description: 'ID de la nota' })
  @IsOptional()
  @IsString()
  noteId?: string;

  @ApiPropertyOptional({ description: 'ID de la tarea' })
  @IsOptional()
  @IsString()
  taskId?: string;
}
