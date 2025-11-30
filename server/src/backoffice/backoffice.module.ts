import { Module } from '@nestjs/common';
import { BackofficeController } from './backoffice.controller';
import { BackofficeService } from './backoffice.service';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [BackofficeController],
    providers: [BackofficeService, PrismaService],
})
export class BackofficeModule { }
