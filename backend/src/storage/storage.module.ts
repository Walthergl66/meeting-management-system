import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './services/local-storage.service';
import { S3StorageService } from './services/s3-storage.service';

const storageProvider = {
  provide: 'STORAGE_SERVICE',
  useFactory: (configService: ConfigService) => {
    const driver = configService.get('storage.driver');
    if (driver === 's3') {
      return new S3StorageService();
    }
    return new LocalStorageService(configService);
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule],
  providers: [storageProvider, LocalStorageService, S3StorageService],
  exports: [storageProvider],
})
export class StorageModule {}
