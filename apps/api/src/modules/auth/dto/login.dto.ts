import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({ example: 'Meetflow123!' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  @MaxLength(128)
  password: string;
}
