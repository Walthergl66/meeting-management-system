import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AssistantService } from './assistant.service';
import {
  SuggestAgendaDto,
  SummarizeMeetingDto,
  SummarizeTasksDto,
} from './dto/assistant.dto';

@ApiTags('assistant')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('summarize-meeting')
  @ApiOperation({ summary: 'Genera un resumen de la reunión' })
  async summarizeMeeting(@Body() dto: SummarizeMeetingDto) {
    const suggestion = await this.assistantService.summarizeMeeting(
      dto.meetingId,
    );
    return suggestion;
  }

  @Post('suggest-agenda')
  @ApiOperation({ summary: 'Sugiere puntos para la agenda' })
  async suggestAgenda(@Body() dto: SuggestAgendaDto) {
    const suggestions = await this.assistantService.suggestAgenda(
      dto.title,
      dto.description,
    );
    return suggestions;
  }

  @Post('summarize-tasks')
  @ApiOperation({ summary: 'Genera un resumen de las tareas del equipo' })
  async summarizeTasks(@Body() dto: SummarizeTasksDto) {
    const suggestion = await this.assistantService.summarizeTasks(dto.teamId);
    return suggestion;
  }
}
