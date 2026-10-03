export interface AssistantSuggestion {
  content: string;
  confidence?: number;
}

export interface IAssistantService {
  summarizeMeeting(meetingId: string): Promise<AssistantSuggestion>;
  suggestAgenda(
    title: string,
    description?: string,
  ): Promise<AssistantSuggestion[]>;
  summarizeTasks(teamId: string): Promise<AssistantSuggestion>;
}
