import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AUDIT_REPOSITORY } from './audit.tokens';
import { PrismaAuditRepository } from './infrastructure/prisma-audit.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    { provide: AUDIT_REPOSITORY, useClass: PrismaAuditRepository },
  ],
  exports: [AuditService],
})
export class AuditModule {}
