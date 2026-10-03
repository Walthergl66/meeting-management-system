import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IStorageService } from '../../storage/interfaces/storage.interface';
import { ATTACHMENT } from '../../shared';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

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
    });

    if (!attachment) {
      throw new NotFoundException('Archivo adjunto no encontrado');
    }

    return attachment;
  }

  async delete(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException('Archivo adjunto no encontrado');
    }

    await this.prisma.attachment.delete({ where: { id } });
    await this.storageService.delete(attachment.storageKey);
  }
}
