import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucketName = process.env.AWS_BUCKET;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.AWS_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(file: Buffer, fileName: string, mimeType: string): Promise<string> {
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: uniqueFileName,
          Body: file,
          ContentType: mimeType,
          // ACL: 'public-read', // Descomente se seu provedor suportar ACLs
        }),
      );

      // Retorna a URL pública
      const publicUrl = process.env.AWS_PUBLIC_URL 
        ? `${process.env.AWS_PUBLIC_URL}/${uniqueFileName}`
        : `${process.env.AWS_ENDPOINT}/${this.bucketName}/${uniqueFileName}`; // Fallback genérico

      return publicUrl;
    } catch (error) {
      this.logger.error(`Erro ao fazer upload: ${error.message}`);
      throw error;
    }
  }
}
