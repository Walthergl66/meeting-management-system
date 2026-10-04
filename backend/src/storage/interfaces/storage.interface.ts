export interface StorageUploadResult {
  key: string;
  url: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IStorageService {
  upload(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string | null;
}
