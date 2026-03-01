import { Test, TestingModule } from '@nestjs/testing';
import { AllExceptionsFilter } from './http-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockHttpAdapter: any;

  beforeEach(async () => {
    mockHttpAdapter = {
      getRequestUrl: jest.fn().mockReturnValue('/test-path'),
      reply: jest.fn(),
    };

    const mockHttpAdapterHost = {
      httpAdapter: mockHttpAdapter,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: HttpAdapterHost,
          useValue: mockHttpAdapterHost,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch HttpException and reply with proper status', () => {
    const mockException = new HttpException(
      'Test Message',
      HttpStatus.BAD_REQUEST,
    );
    const mockHost = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as any;

    filter.catch(mockException, mockHost);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          statusCode: 400,
          path: '/test-path',
          error: expect.objectContaining({ message: 'Test Message' }),
        }),
        HttpStatus.BAD_REQUEST,
      );
  });

  it('should catch generic Error and reply with 500 status', () => {
    const mockException = new Error('Generic Error');
    const mockHost = {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as any;

    // Spy on logger to avoid console spam
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => {});

    filter.catch(mockException, mockHost);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          statusCode: 500,
          error: expect.objectContaining({ message: 'Internal Server Error' }),
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
  });
});
