import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AUTH } from '@meetflow/config';

export class RegisterDto {
  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({ example: 'Ana Propietaria', minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ example: 'Meetflow123!', minLength: AUTH.PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(AUTH.PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${AUTH.PASSWORD_MIN_LENGTH} caracteres`,
  })
  password: string;

  @ApiPropertyOptional({
    example: 'America/Mexico_City',
    description: 'Zona horaria IANA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
