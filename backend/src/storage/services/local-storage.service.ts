import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { StorageConfig } from '../../config/configuration';
import {
  IStorageService,
  StorageUploadResult,
} from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private basePath: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const storage = this.configService.get<StorageConfig>('storage');
    this.basePath = storage.localPath;
    if (this.basePath.startsWith('./')) {
      this.basePath = join(process.cwd(), this.basePath);
    }
    fs.ensureDirSync(this.basePath);
    this.logger.log(`Almacenamiento local inicializado en: ${this.basePath}`);
  }

  async upload(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StorageUploadResult> {
    const extension = this.getExtension(params.originalName);
    const filename = `${randomUUID()}${extension}`;
    const key = filename;
    const filePath = join(this.basePath, filename);

    await fs.writeFile(filePath, params.buffer);
    return {
      key,
      url: null,
      filename,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    };
  }

  async delete(_key: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void _key;
    const filePath = join(this.basePath, _key);
    await fs.remove(filePath).catch(() => undefined);
  }

  getUrl(_key: string): string | null {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void _key;
    return null;
  }

  private getExtension(originalName: string): string {
    const parts = originalName.split('.');
    if (parts.length <= 1) {
      return '';
    }
    return `.${parts.pop()}`;
  }
}
