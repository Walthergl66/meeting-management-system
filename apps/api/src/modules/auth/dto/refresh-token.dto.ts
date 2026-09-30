import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token. Si se omite se toma de la cookie HttpOnly refresh_token.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
