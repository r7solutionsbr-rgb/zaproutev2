import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '../prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { MailModule } from '../mail/mail.module'; // <--- Importe do MailModule

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SEGREDO_SUPER_SECRETO_DO_MVP', // Usando variável de ambiente ou fallback
      signOptions: { expiresIn: '12h' }, // O token expira em 12 horas
    }),
    MailModule, // <--- Adicione aqui para disponibilizar o MailService
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}