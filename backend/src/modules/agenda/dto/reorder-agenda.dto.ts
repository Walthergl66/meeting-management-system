import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class ReorderAgendaDto {
  @ApiProperty({ type: [String], example: ['clid1', 'clid2', 'clid3'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  order: string[];
}
