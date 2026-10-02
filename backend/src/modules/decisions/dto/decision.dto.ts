import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDecisionDto {
  @ApiProperty({ example: 'Usar PostgreSQL FTS para búsqueda' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'Se decidió usar Postgres FTS por simplicidad operacional.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}

export class UpdateDecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}
