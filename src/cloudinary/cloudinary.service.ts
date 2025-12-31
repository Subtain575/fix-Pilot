import { Injectable, Inject } from '@nestjs/common';
import {
  UploadApiResponse,
  UploadApiErrorResponse,
  v2 as cloudinary,
} from 'cloudinary';

type CloudinaryInstance = typeof cloudinary;

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinary: CloudinaryInstance,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error: Error | undefined, result: UploadApiResponse) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<UploadApiResponse> {
    return (await this.cloudinary.uploader.destroy(
      publicId,
    )) as Promise<UploadApiResponse>;
  }

  extractPublicId(url: string): string {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return fileName.split('.')[0];
  }
}
