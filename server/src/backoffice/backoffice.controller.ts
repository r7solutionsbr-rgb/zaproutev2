import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { BackofficeService } from './backoffice.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Backoffice')
@ApiBearerAuth()
@Controller('backoffice')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class BackofficeController {
  constructor(private readonly backofficeService: BackofficeService) {}

  @ApiOperation({ summary: 'Listar todas as empresas' })
  @Get('tenants')
  async getAllTenants() {
    return this.backofficeService.getAllTenants();
  }

  @ApiOperation({ summary: 'Criar nova empresa' })
  @Post('tenants')
  async createTenant(@Body() data: any) {
    return this.backofficeService.createTenant(data);
  }

  @ApiOperation({ summary: 'Atualizar status da empresa' })
  @Patch('tenants/:id/status')
  async updateTenantStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.backofficeService.updateTenantStatus(id, status);
  }

  @ApiOperation({ summary: 'Atualizar dados da empresa' })
  @Patch('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() data: any) {
    return this.backofficeService.updateTenant(id, data);
  }
}
