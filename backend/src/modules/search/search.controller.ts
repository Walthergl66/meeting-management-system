import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MEETING_STATUSES, TASK_PRIORITIES, TASK_STATUSES } from '../../shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { SearchService } from './search.service';
import { SearchQueryDto, SearchResultDto } from './dto/search.dto';
import { SearchQuery, SearchType } from './search.types';

export const SEARCH_DEFAULT_LIMIT = 20;

@ApiTags('search')
@ApiBearerAuth('access-token')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Búsqueda full-text en los equipos del usuario',
  })
  @ApiOkResponse({ type: SearchResultDto })
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: SearchQueryDto,
  ) {
    return this.searchService.search(user.id, this.toQuery(dto));
  }

  private toQuery(dto: SearchQueryDto): SearchQuery {
    // El enum de status es compartido entre reuniones y tareas: solo se acepta
    // un valor que exista en alguno de los dos dominios.
    const status =
      dto.status &&
      ([...MEETING_STATUSES, ...TASK_STATUSES] as string[]).includes(dto.status)
        ? (dto.status as SearchQuery['status'])
        : undefined;

    const priority = (TASK_PRIORITIES as string[]).includes(dto.priority)
      ? (dto.priority as SearchQuery['priority'])
      : undefined;

    return {
      q: dto.q,
      type: dto.type as SearchType | undefined,
      teamId: dto.teamId,
      userId: dto.userId,
      status,
      priority,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
      limit: dto.limit ?? SEARCH_DEFAULT_LIMIT,
    };
  }
}
