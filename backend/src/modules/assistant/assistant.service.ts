import { Inject, Injectable } from '@nestjs/common';
import {
  IAssistantService,
  AssistantSuggestion,
} from './interfaces/assistant.interface';

@Injectable()
export class AssistantService implements IAssistantService {
  constructor(
    @Inject('ASSISTANT_SERVICE')
    private readonly assistant: IAssistantService,
  ) {}

  summarizeMeeting(meetingId: string): Promise<AssistantSuggestion> {
    return this.assistant.summarizeMeeting(meetingId);
  }

  suggestAgenda(
    title: string,
    description?: string,
  ): Promise<AssistantSuggestion[]> {
    return this.assistant.suggestAgenda(title, description);
  }

  summarizeTasks(teamId: string): Promise<AssistantSuggestion> {
    return this.assistant.summarizeTasks(teamId);
  }
}
