import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TeamsService } from '../teams/teams.service';
import { IStorageService } from '../../storage/interfaces/storage.interface';
import { STORAGE_SERVICE } from '../../storage/storage.tokens';
import { ATTACHMENT } from '../../shared';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { ATTACHMENTS_REPOSITORY } from './attachments.tokens';
import {
  AttachmentWithScope,
  AttachmentsRepository,
} from './attachments.repository';

@Injectable()
export class AttachmentsService {
  constructor(
    @Inject(ATTACHMENTS_REPOSITORY)
    private readonly attachmentsRepository: AttachmentsRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly teamsService: TeamsService,
  ) {}

  async upload(
    userId: string,
    file: Express.Multer.File,
    dto: CreateAttachmentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo no proporcionado');
    }

    // Red de seguridad: en HTTP, Multer ya corta antes (ATTACHMENT_UPLOAD_LIMITS).
    if (file.size > ATTACHMENT.MAX_SIZE_BYTES) {
      throw new BadRequestException(
        'El archivo excede el tamaño máximo de 10 MB',
      );
    }

    if (
      ATTACHMENT.ALLOWED_MIME_TYPES.length > 0 &&
      !(ATTACHMENT.ALLOWED_MIME_TYPES as readonly string[]).includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException('Tipo de archivo no permitido');
    }

    const targets = [dto.meetingId, dto.noteId, dto.taskId].filter(Boolean);
    if (targets.length === 0) {
      throw new BadRequestException(
        'Se requiere al menos un destino (meetingId, noteId o taskId)',
      );
    }
    if (targets.length > 1) {
      throw new BadRequestException(
        'Solo se puede asociar a un destino a la vez',
      );
    }

    // El destino debe pertenecer a un equipo del usuario: sin esta comprobacion
    // el endpoint es un primitivo de escritura cross-tenant.
    const teamId = await this.resolveTargetTeamId(dto);
    await this.assertMembership(teamId, userId);

    const storageResult = await this.storageService.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });

    const attachment = await this.attachmentsRepository.create({
      filename: storageResult.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey: storageResult.key,
      storageUrl: storageResult.url,
      meetingId: dto.meetingId,
      noteId: dto.noteId,
      taskId: dto.taskId,
    });

    return attachment;
  }

  async findOne(userId: string, id: string) {
    const attachment = await this.attachmentsRepository.findByIdWithScope(id);

    if (!attachment) {
      throw new NotFoundException('Archivo adjunto no encontrado');
    }

    await this.assertOwnership(attachment, userId);

    return attachment;
  }

  async delete(userId: string, id: string) {
    const attachment = await this.attachmentsRepository.findByIdWithScope(id);

    if (!attachment) {
      throw new NotFoundException('Archivo adjunto no encontrado');
    }

    await this.assertOwnership(attachment, userId);

    await this.attachmentsRepository.delete(id);
    await this.storageService.delete(attachment.storageKey);
  }

  /**
   * Exige que el usuario pertenezca al equipo dueno del adjunto. Un adjunto
   * sin destino resoluble no tiene equipo: se rechaza en lugar de concederse.
   */
  private async assertOwnership(
    attachment: AttachmentWithScope,
    userId: string,
  ): Promise<void> {
    const teamId =
      attachment.meeting?.teamId ??
      attachment.note?.meeting.teamId ??
      attachment.task?.teamId;

    if (!teamId) {
      throw new ForbiddenException(
        'El archivo adjunto no pertenece a ningún equipo',
      );
    }

    await this.assertMembership(teamId, userId);
  }

  private async assertMembership(
    teamId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.teamsService.findMembership(teamId, userId);

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }
  }

  private async resolveTargetTeamId(dto: CreateAttachmentDto): Promise<string> {
    if (dto.meetingId) {
      const teamId = await this.attachmentsRepository.findMeetingTeamId(
        dto.meetingId,
      );
      if (!teamId) {
        throw new NotFoundException('La reunión no existe');
      }
      return teamId;
    }

    if (dto.noteId) {
      const teamId = await this.attachmentsRepository.findNoteTeamId(
        dto.noteId,
      );
      if (!teamId) {
        throw new NotFoundException('La nota no existe');
      }
      return teamId;
    }

    if (dto.taskId) {
      const teamId = await this.attachmentsRepository.findTaskTeamId(
        dto.taskId,
      );
      if (!teamId) {
        throw new NotFoundException('La tarea no existe');
      }
      return teamId;
    }

    throw new BadRequestException(
      'Se requiere al menos un destino (meetingId, noteId o taskId)',
    );
  }
}
