import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeamsModule } from '../teams/teams.module';
import { MeetingAccessModule } from '../meetings/meeting-access.module';
import { IAssistantService } from './interfaces/assistant.interface';
import { ASSISTANT_SERVICE } from './assistant.tokens';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { FakeAssistantService } from './providers/fake-assistant.service';
import { GeminiAssistantService } from './providers/gemini-assistant.service';

const assistantProvider = {
  provide: ASSISTANT_SERVICE,
  useFactory: (
    configService: ConfigService,
    fakeAssistantService: FakeAssistantService,
    geminiAssistantService: GeminiAssistantService,
  ): IAssistantService => {
    const apiKey = configService.get<string>('ai.geminiApiKey');
    if (apiKey) {
      return geminiAssistantService;
    }
    return fakeAssistantService;
  },
  inject: [ConfigService, FakeAssistantService, GeminiAssistantService],
};

@Module({
  imports: [ConfigModule, TeamsModule, MeetingAccessModule],
  controllers: [AssistantController],
  providers: [
    FakeAssistantService,
    GeminiAssistantService,
    assistantProvider,
    AssistantService,
  ],
  exports: [ASSISTANT_SERVICE],
})
export class AssistantModule {}
