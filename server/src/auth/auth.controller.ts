import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { DataResponseDto } from '../common/dto/response.dto';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Realizar login' })
  @ApiOkResponse({ type: DataResponseDto })
  @ApiBody({
    schema: {
      example: { email: 'admin@zaproute.com.br', password: 'password' },
    },
  })
  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new HttpException(
        'E-mail ou senha incorretos',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const data = await this.authService.login(user);
    return { data };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiOkResponse({ type: DataResponseDto })
  @ApiBody({ schema: { example: { email: 'user@example.com' } } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(body.email);
    return { data };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiOkResponse({ type: DataResponseDto })
  @ApiBody({
    schema: { example: { token: 'TOKEN_XYZ', password: 'newpassword' } },
  })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    try {
      const data = await this.authService.resetPassword(
        body.token,
        body.password,
      );
      return { data };
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
