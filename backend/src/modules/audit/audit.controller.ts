import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuditService } from './audit.service';
import { AuditLogPageDto, AuditQueryDto } from './dto/audit.dto';

export const AUDIT_DEFAULT_LIMIT = 50;

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registro de auditoría de los equipos del usuario',
  })
  @ApiOkResponse({ type: AuditLogPageDto })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditService.list(user.id, {
      action: query.action,
      entity: query.entity,
      entityId: query.entityId,
      userId: query.userId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit ?? AUDIT_DEFAULT_LIMIT,
      offset: query.offset ?? 0,
    });
  }
}
