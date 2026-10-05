import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import { NotificationsService } from './notifications.service';
import { toNotificationPresenter } from './notifications.presenter';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista las notificaciones del usuario' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    const notifications = await this.notificationsService.list(
      user.id,
      query.read === undefined ? undefined : query.read === 'true',
    );
    return notifications.map(toNotificationPresenter);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca una notificación como leída' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const notification = await this.notificationsService.markAsRead(
      user.id,
      id,
    );
    return toNotificationPresenter(notification);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca todas las notificaciones como leídas' })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAllAsRead(user.id);
    return { message: 'Notificaciones marcadas como leídas' };
  }
}
