import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IAssistantService,
  AssistantSuggestion,
} from '../interfaces/assistant.interface';

@Injectable()
export class GeminiAssistantService implements IAssistantService {
  private readonly logger = new Logger(GeminiAssistantService.name);
  private readonly hasApiKey: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.geminiApiKey');
    this.hasApiKey = !!apiKey;
    if (this.hasApiKey) {
      this.logger.log('Gemini API key detectada (modo IA real)');
    } else {
      this.logger.log('Sin Gemini API key; IA real no disponible');
    }
  }

  async summarizeMeeting(meetingId: string): Promise<AssistantSuggestion> {
    this.logger.warn(
      'Gemini real no implementado aún - devuelva modo fallback',
    );
    return {
      content: `Resumen para reunión ${meetingId} (stub Gemini).`,
      confidence: 0.7,
    };
  }

  async suggestAgenda(
    title: string,
    description?: string,
  ): Promise<AssistantSuggestion[]> {
    const contexto = description ? `${title}: ${description}` : title;
    this.logger.warn(
      `Gemini real no implementado aún para "${contexto}" - devuelva modo fallback`,
    );
    return [
      { content: 'Punto 1', confidence: 0.7 },
      { content: 'Punto 2', confidence: 0.7 },
    ];
  }

  async summarizeTasks(teamId: string): Promise<AssistantSuggestion> {
    this.logger.warn(
      'Gemini real no implementado aún - devuelva modo fallback',
    );
    return {
      content: `Resumen de tareas equipo ${teamId} (stub Gemini).`,
      confidence: 0.7,
    };
  }
}
