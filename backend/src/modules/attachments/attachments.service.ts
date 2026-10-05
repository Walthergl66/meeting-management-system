import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IStorageService } from '../../storage/interfaces/storage.interface';
import { ATTACHMENT } from '../../shared';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

/**
 * Proyeccion minima para resolver el equipo dueno de un adjunto. Se include
 * solo el teamId en cada rama: el adjunto se resuelve en una consulta, no en
 * varias, y el presenter decide que se expone.
 */
const attachmentTeamScope = {
  meeting: { select: { teamId: true } },
  note: { select: { meeting: { select: { teamId: true } } } },
  task: { select: { teamId: true } },
} as const;

type AttachmentWithScope = {
  meeting: { teamId: string } | null;
  note: { meeting: { teamId: string } } | null;
  task: { teamId: string } | null;
};

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('STORAGE_SERVICE')
    private readonly storageService: IStorageService,
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

    const attachment = await this.prisma.attachment.create({
      data: {
        filename: storageResult.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: storageResult.key,
        storageUrl: storageResult.url,
        meetingId: dto.meetingId,
        noteId: dto.noteId,
        taskId: dto.taskId,
      },
    });

    return attachment;
  }

  async findOne(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: attachmentTeamScope,
    });

    if (!attachment) {
      throw new NotFoundException('Archivo adjunto no encontrado');
    }

    await this.assertOwnership(attachment, userId);

    return attachment;
  }

  async delete(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: attachmentTeamScope,
    });

    if (!attachment) {
      throw new NotFoundException('Archivo adjunto no encontrado');
    }

    await this.assertOwnership(attachment, userId);

    await this.prisma.attachment.delete({ where: { id } });
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
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('No perteneces a este equipo');
    }
  }

  private async resolveTargetTeamId(dto: CreateAttachmentDto): Promise<string> {
    if (dto.meetingId) {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: dto.meetingId },
        select: { teamId: true },
      });
      if (!meeting) {
        throw new NotFoundException('La reunión no existe');
      }
      return meeting.teamId;
    }

    if (dto.noteId) {
      const note = await this.prisma.meetingNote.findUnique({
        where: { id: dto.noteId },
        select: { meeting: { select: { teamId: true } } },
      });
      if (!note) {
        throw new NotFoundException('La nota no existe');
      }
      return note.meeting.teamId;
    }

    if (dto.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: dto.taskId },
        select: { teamId: true },
      });
      if (!task) {
        throw new NotFoundException('La tarea no existe');
      }
      return task.teamId;
    }

    throw new BadRequestException(
      'Se requiere al menos un destino (meetingId, noteId o taskId)',
    );
  }
}
