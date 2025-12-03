import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { DiagnosticController } from './diagnostic.controller';

@Module({
  controllers: [DiagnosticController],
  providers: [MailService],
  exports: [MailService], // Exportamos para usar no AuthModule
})
export class MailModule { }