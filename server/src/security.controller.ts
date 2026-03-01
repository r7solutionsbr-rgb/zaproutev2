import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('security')
export class SecurityController {
  /**
   * Endpoint para obter o CSRF token
   * O frontend deve chamar este endpoint e incluir o token em requisições subsequentes
   */
  @Get('csrf-token')
  getCsrfToken(@Req() req: Request) {
    return {
      data: {
        csrfToken: (req as any).csrfToken(),
        message:
          'Include this token in the X-CSRF-Token header for state-changing requests',
      },
    };
  }
}
