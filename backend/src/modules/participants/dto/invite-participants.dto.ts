import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

export class InviteParticipantsDto {
  @ApiProperty({ type: [String], example: ['clxxxxxxxx', 'clxxxxxxxy'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  userIds: string[];
}
