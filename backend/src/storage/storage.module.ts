import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IStorageService } from './interfaces/storage.interface';
import { LocalStorageService } from './services/local-storage.service';
import { S3StorageService } from './services/s3-storage.service';
import { STORAGE_SERVICE } from './storage.tokens';

const storageProvider = {
  provide: STORAGE_SERVICE,
  useFactory: (
    configService: ConfigService,
    localStorageService: LocalStorageService,
    s3StorageService: S3StorageService,
  ): IStorageService => {
    const driver = configService.get('storage.driver');
    if (driver === 's3') {
      return s3StorageService;
    }
    return localStorageService;
  },
  inject: [ConfigService, LocalStorageService, S3StorageService],
};

@Module({
  imports: [ConfigModule],
  providers: [LocalStorageService, S3StorageService, storageProvider],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
