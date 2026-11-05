import { Inject, Injectable } from '@nestjs/common';
import { MEETINGS_REPOSITORY } from './meetings.tokens';
import { MeetingsRepository } from './meetings.repository';

export interface MeetingAccessScope {
  id: string;
  teamId: string;
  organizerId: string;
  status: string;
}

@Injectable()
export class MeetingAccessService {
  constructor(
    @Inject(MEETINGS_REPOSITORY) private readonly meetings: MeetingsRepository,
  ) {}

  async findByResourceId(id: string): Promise<MeetingAccessScope | null> {
    return this.meetings.findAccessByResourceId(id);
  }

  async findByAgendaItemId(itemId: string): Promise<MeetingAccessScope | null> {
    return this.meetings.findAccessByAgendaItemId(itemId);
  }
}
