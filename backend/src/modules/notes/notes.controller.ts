import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeetingAccessGuard } from '../../common/guards/meeting-access.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';
import { NotesService } from './notes.service';
import { toNotePresenter } from './notes.presenter';

@ApiTags('notes')
@ApiBearerAuth('access-token')
@UseGuards(MeetingAccessGuard)
@Controller()
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get('meetings/:id/notes')
  @ApiOperation({ summary: 'Lista las notas de la reunión' })
  async list(
    @Request()
    request: {
      meeting: { id: string; teamId: string; organizerId: string };
    },
  ) {
    const notes = await this.notesService.list(request.meeting);
    return notes.map(toNotePresenter);
  }

  @Post('meetings/:id/notes')
  @ApiOperation({ summary: 'Crea una nota en la reunión' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNoteDto,
    @Request()
    request: { meeting: { id: string; teamId: string; organizerId: string } },
  ) {
    const note = await this.notesService.create(
      user.id,
      request.meeting,
      dto.content,
    );
    return toNotePresenter(note);
  }

  @Patch('notes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza una nota' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') noteId: string,
    @Body() dto: UpdateNoteDto,
    @Request()
    request: { meeting: { id: string; teamId: string; organizerId: string } },
  ) {
    const note = await this.notesService.update(
      user.id,
      request.meeting,
      noteId,
      dto.content,
    );
    return toNotePresenter(note);
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una nota' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') noteId: string,
    @Request()
    request: { meeting: { id: string; teamId: string; organizerId: string } },
  ): Promise<{ message: string }> {
    await this.notesService.remove(user.id, request.meeting, noteId);
    return { message: 'Nota eliminada' };
  }
}
