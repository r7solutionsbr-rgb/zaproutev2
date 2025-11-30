import { Module } from '@nestjs/common';
import { JourneyController } from './journey.controller';
import { JourneyService } from './journey.service';
import { PrismaService } from '../prisma.service';

@Module({
    imports: [],
    controllers: [JourneyController],
    providers: [JourneyService, PrismaService],
    exports: [JourneyService],
})
export class JourneyModule { }
