import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CarriersService } from './carriers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateCarrierDto, UpdateCarrierDto } from './dto/carrier.dto';

@Controller('carriers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.carriersService.findAll(req.user.tenantId);
  }

  @Post()
  async create(@Body() data: CreateCarrierDto, @Req() req: any) {
    return this.carriersService.create({
      ...data,
      tenantId: req.user.tenantId,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateCarrierDto,
    @Req() req: any,
  ) {
    return this.carriersService.update(id, req.user.tenantId, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.carriersService.remove(id, req.user.tenantId);
  }
}
