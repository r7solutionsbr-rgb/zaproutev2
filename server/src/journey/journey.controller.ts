import { Controller, Post, Body, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JourneyService } from './journey.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JourneyEventType } from '@prisma/client';

@Controller('journey')
@UseGuards(JwtAuthGuard)
export class JourneyController {
    constructor(private readonly journeyService: JourneyService) { }

    @Post('event')
    async createEvent(@Req() req: any, @Body() body: {
        driverId: string; // If admin is posting. If driver app, maybe infer from user? 
        // For now, let's assume the user IS the driver or an admin posting for them.
        // If the logged in user is a DRIVER, force driverId = user.id (need to link User to Driver?)
        // Currently User and Driver are separate entities. DriverApp likely uses a User login that has role 'DRIVER'.
        // We need to find the Driver associated with this User.
        type: JourneyEventType;
        latitude?: number;
        longitude?: number;
        locationAddress?: string;
        notes?: string;
    }) {
        // TODO: If req.user.role === 'DRIVER', verify if body.driverId matches their linked driver profile.
        // For MVP, we trust the client sends the correct driverId (validated in Service by tenantId).
        return this.journeyService.createEvent(req.user.tenantId, body.driverId, body);
    }

    @Get(':driverId/history')
    async getHistory(
        @Req() req: any,
        @Param('driverId') driverId: string,
        @Query('date') date?: string
    ) {
        return this.journeyService.getHistory(req.user.tenantId, driverId, date);
    }
}
