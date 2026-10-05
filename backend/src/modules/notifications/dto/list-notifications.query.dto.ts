import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class ListNotificationsQueryDto {
  /**
   * El campo se declara como texto a propósito, no como boolean. El
   * ValidationPipe global usa enableImplicitConversion, y class-transformer
   * convierte a boolean por truthiness cuando existe metadata design:type
   * Boolean: 'false' se convertía en true y 'si' pasaba la validación. Esa
   * conversión implícita se aplica después de cualquier @Transform, así que
   * tampoco se puede arreglar con @Transform. Validando el texto y
   * convertiendo en el controlador, el resultado es determinista.
   */
  @ApiPropertyOptional({
    description: 'Filtrar por estado de lectura',
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsString()
  @Matches(/^(true|false)$/, { message: 'read debe ser true o false' })
  read?: string;
}
