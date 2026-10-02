import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAGINATION } from '../../shared';

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: PAGINATION.DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PAGINATION.MAX_LIMIT,
    default: PAGINATION.DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit?: number = PAGINATION.DEFAULT_LIMIT;

  get skip(): number {
    return (
      ((this.page ?? PAGINATION.DEFAULT_PAGE) - 1) *
      (this.limit ?? PAGINATION.DEFAULT_LIMIT)
    );
  }

  get take(): number {
    return this.limit ?? PAGINATION.DEFAULT_LIMIT;
  }
}

export class PaginationMetaDto {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiPropertyOptional({ example: 'OK' })
  message?: string;
}

export class SuccessResponseDto<T> {
  @ApiProperty()
  data: T;

  @ApiPropertyOptional({ example: 'OK' })
  message?: string;
}
