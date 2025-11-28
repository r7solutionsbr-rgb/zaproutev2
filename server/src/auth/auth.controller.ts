import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    // 1. Valida credenciais
    const user = await this.authService.validateUser(body.email, body.password);
    
    if (!user) {
      throw new HttpException('E-mail ou senha incorretos', HttpStatus.UNAUTHORIZED);
    }
    
    // 2. Gera e retorna o Token
    return this.authService.login(user);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }) {
    try {
      return await this.authService.resetPassword(body.token, body.password);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}