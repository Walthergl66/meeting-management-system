import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('debe retornar la información de la API', () => {
      const info = appController.getInfo();

      expect(info.name).toBe('MeetFlow API');
      expect(info.documentation).toBe('/api/docs');
      expect(info.health).toBe('/health');
    });
  });
});
