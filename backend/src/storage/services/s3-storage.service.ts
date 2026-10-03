import { Injectable, Logger } from '@nestjs/common';
import {
  IStorageService,
  StorageUploadResult,
} from '../interfaces/storage.interface';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);

  async upload(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StorageUploadResult> {
    this.logger.warn('Almacenamiento S3 no implementado aún - usando stub');
    return {
      key: 'stub',
      url: null,
      filename: params.originalName,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(key: string): Promise<void> {
    this.logger.warn(`Eliminar ${key} desde S3 no implementado (stub)`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUrl(key: string): string | null {
    return null;
  }
}
