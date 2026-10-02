import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  MEETING_STATUSES,
  SEARCH_ENTITY_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../../../shared';

export class SearchQueryDto {
  @ApiProperty({ description: 'Texto a buscar', example: 'observabilidad' })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({
    enum: SEARCH_ENTITY_TYPES,
    description: 'Si se omite, busca en todas las entidades',
  })
  @IsOptional()
  @IsEnum(SEARCH_ENTITY_TYPES)
  type?: (typeof SEARCH_ENTITY_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    enum: [...MEETING_STATUSES, ...TASK_STATUSES],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class SearchResultDto {
  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({
    description: 'Resultados agrupados por entidad, solo con los que hubo hits',
  })
  groups!: Record<string, unknown[]>;
}
