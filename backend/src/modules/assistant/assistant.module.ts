import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { FakeAssistantService } from './providers/fake-assistant.service';
import { GeminiAssistantService } from './providers/gemini-assistant.service';

const assistantProvider = {
  provide: 'ASSISTANT_SERVICE',
  useFactory: (configService: ConfigService) => {
    const apiKey = configService.get<string>('ai.geminiApiKey');
    if (apiKey) {
      return new GeminiAssistantService(configService);
    }
    return new FakeAssistantService();
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule],
  controllers: [AssistantController],
  providers: [assistantProvider, AssistantService],
})
export class AssistantModule {}
