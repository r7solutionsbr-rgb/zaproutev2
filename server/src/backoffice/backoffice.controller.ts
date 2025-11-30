import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { BackofficeService } from './backoffice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';

@Controller('backoffice')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class BackofficeController {
    constructor(private readonly backofficeService: BackofficeService) { }

    @Get('tenants')
    async getAllTenants() {
        return this.backofficeService.getAllTenants();
    }

    @Post('tenants')
    async createTenant(@Body() data: any) {
        return this.backofficeService.createTenant(data);
    }

    @Patch('tenants/:id/status')
    async updateTenantStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.backofficeService.updateTenantStatus(id, status);
    }
}
