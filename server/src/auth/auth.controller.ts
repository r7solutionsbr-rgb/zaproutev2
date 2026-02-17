import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Realizar login' })
  @ApiBody({
    schema: {
      example: { email: 'admin@zaproute.com.br', password: 'password' },
    },
  })
  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new HttpException(
        'E-mail ou senha incorretos',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return this.authService.login(user);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiBody({ schema: { example: { email: 'user@example.com' } } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiBody({
    schema: { example: { token: 'TOKEN_XYZ', password: 'newpassword' } },
  })
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    try {
      return await this.authService.resetPassword(body.token, body.password);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
