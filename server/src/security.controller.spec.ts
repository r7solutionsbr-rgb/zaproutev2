import { Test, TestingModule } from '@nestjs/testing';
import { SecurityController } from './security.controller';

describe('SecurityController', () => {
  let controller: SecurityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityController],
    }).compile();

    controller = module.get<SecurityController>(SecurityController);
  });

  describe('getCsrfToken', () => {
    it('should return CSRF token from request', () => {
      const mockRequest = {
        csrfToken: jest.fn().mockReturnValue('mock-csrf-token-123'),
      } as any;

      const result = controller.getCsrfToken(mockRequest);

      expect(result).toHaveProperty('csrfToken');
      expect(result.csrfToken).toBe('mock-csrf-token-123');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('X-CSRF-Token');
      expect(mockRequest.csrfToken).toHaveBeenCalled();
    });

    it('should include usage instructions in response', () => {
      const mockRequest = {
        csrfToken: jest.fn().mockReturnValue('token'),
      } as any;

      const result = controller.getCsrfToken(mockRequest);

      expect(result.message).toBe(
        'Include this token in the X-CSRF-Token header for state-changing requests',
      );
    });
  });
});
