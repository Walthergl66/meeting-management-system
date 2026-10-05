import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../shared';

/**
 * Los query params llegan como texto plano. Con `@Query('status') status:
 * TaskStatus` Nest no valida nada, porque el tipo declarado es un enum y no
 * una clase: un `?status=inventado` llegaba entero a Prisma y salía como 500.
 * Este DTO hace que un valor desconocido sea un 422 con el detalle del campo.
 */
export class ListTasksQueryDto {
  @ApiPropertyOptional({ description: 'Equipo por el que filtrar' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  teamId?: string;

  @ApiPropertyOptional({ enum: TaskStatus, enumName: 'TaskStatus' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, enumName: 'TaskPriority' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  meetingId?: string;

  @ApiPropertyOptional({ description: 'Fecha límite inferior (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha límite superior (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
