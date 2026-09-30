import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'MeetFlow API',
      version: '0.1.0',
      documentation: '/api/docs',
      health: '/health',
    };
  }
}
