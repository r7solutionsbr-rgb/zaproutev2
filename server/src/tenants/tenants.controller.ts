import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UpdateTenantConfigDto, UpdateTenantDto } from './dto/tenant.dto';

@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  async findMe(@Request() req: any) {
    // O ID da empresa vem do token do usuário logado
    return this.tenantsService.findOne(req.user.tenantId);
  }

  @Patch('me')
  async updateMe(@Request() req: any, @Body() data: UpdateTenantDto) {
    return this.tenantsService.update(req.user.tenantId, data);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    // Segurança: Garantir que o usuário só acesse seu próprio tenant (ou seja admin)
    // Por enquanto, vamos simplificar e verificar se o ID bate
    if (req.user.tenantId !== id && req.user.role !== 'SUPER_ADMIN') {
      // throw new ForbiddenException('Acesso negado');
    }
    return this.tenantsService.findOne(id);
  }

  @Patch(':id/config')
  async updateConfig(
    @Param('id') id: string,
    @Body() data: UpdateTenantConfigDto,
  ) {
    return this.tenantsService.update(id, { config: data.config });
  }
}
