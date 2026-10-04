import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SuggestAgendaDto {
  @ApiProperty({ description: 'Título de la reunión' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descripción de la reunión' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SummarizeMeetingDto {
  @ApiProperty({ description: 'ID de la reunión' })
  @IsString()
  meetingId: string;
}

export class SummarizeTasksDto {
  @ApiProperty({ description: 'ID del equipo' })
  @IsString()
  teamId: string;
}
