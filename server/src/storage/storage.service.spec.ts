import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let s3SendSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.AWS_BUCKET = 'test-bucket';
    process.env.AWS_ENDPOINT = 'http://localhost:4566';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    delete process.env.AWS_PUBLIC_URL;

    // Spy on S3Client.prototype.send before instantiation
    s3SendSpy = jest.spyOn(S3Client.prototype, 'send');

    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    s3SendSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    const mockFile = Buffer.from('test content');
    const fileName = 'test.jpg';
    const mimeType = 'image/jpeg';
    const uuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should upload a file and return the public URL using AWS_ENDPOINT', async () => {
      (uuidv4 as jest.Mock).mockReturnValue(uuid);
      s3SendSpy.mockResolvedValue({});

      const result = await service.uploadFile(mockFile, fileName, mimeType);

      expect(result).toBe(`http://localhost:4566/test-bucket/${uuid}.jpg`);
      expect(s3SendSpy).toHaveBeenCalledWith(expect.any(PutObjectCommand));

      const command = s3SendSpy.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: `${uuid}.jpg`,
          Body: mockFile,
          ContentType: mimeType,
        }),
      );
    });

    it('should use AWS_PUBLIC_URL if defined', async () => {
      process.env.AWS_PUBLIC_URL = 'https://cdn.zaproute.com';
      (uuidv4 as jest.Mock).mockReturnValue(uuid);
      s3SendSpy.mockResolvedValue({});

      const result = await service.uploadFile(mockFile, fileName, mimeType);

      expect(result).toBe(`https://cdn.zaproute.com/${uuid}.jpg`);
    });

    it('should throw an error and log it if S3 upload fails', async () => {
      s3SendSpy.mockRejectedValue(new Error('S3 Connection Failed'));

      await expect(
        service.uploadFile(mockFile, fileName, mimeType),
      ).rejects.toThrow('S3 Connection Failed');
    });
  });
});
