import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ATTACHMENT_UPLOAD_LIMITS } from './attachments.upload-limits';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { toAttachmentResponse } from './attachments.presenter';

@ApiTags('attachments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Sube un archivo adjunto' })
  @ApiConsumes('multipart/form-data')
  // El límite va en Multer, no solo en el servicio: sin él el archivo entero
  // se guarda en memoria antes de poder rechazar nada. Ver
  // ATTACHMENT_UPLOAD_LIMITS.
  @UseInterceptors(
    FileInterceptor('file', { limits: ATTACHMENT_UPLOAD_LIMITS }),
  )
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateAttachmentDto,
  ) {
    const attachment = await this.attachmentsService.upload(user.id, file, dto);
    return toAttachmentResponse(attachment);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene la información de un archivo adjunto' })
  @ApiParam({ name: 'id', description: 'ID del adjunto' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const attachment = await this.attachmentsService.findOne(user.id, id);
    return toAttachmentResponse(attachment);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un archivo adjunto' })
  @ApiParam({ name: 'id', description: 'ID del adjunto' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.attachmentsService.delete(user.id, id);
    return { message: 'Archivo adjunto eliminado' };
  }
}
