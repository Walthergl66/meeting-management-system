import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { TeamsModule } from '../teams/teams.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { ATTACHMENTS_REPOSITORY } from './attachments.tokens';
import { PrismaAttachmentsRepository } from './infrastructure/prisma-attachments.repository';

@Module({
  imports: [PrismaModule, StorageModule, ConfigModule, TeamsModule],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    { provide: ATTACHMENTS_REPOSITORY, useClass: PrismaAttachmentsRepository },
  ],
})
export class AttachmentsModule {}
