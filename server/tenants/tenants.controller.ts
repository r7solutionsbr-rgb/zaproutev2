import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  async findMe(@Request() req: any) {
    // O ID da empresa vem do token do usuário logado
    return this.tenantsService.findOne(req.user.tenantId);
  }

  @Patch('me')
  async updateMe(@Request() req: any, @Body() data: any) {
    return this.tenantsService.update(req.user.tenantId, data);
  }
}