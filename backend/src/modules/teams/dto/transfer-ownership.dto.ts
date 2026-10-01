import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({ example: 'usr_2' })
  @IsString()
  newOwnerId: string;
}
