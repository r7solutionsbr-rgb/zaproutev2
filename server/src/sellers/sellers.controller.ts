import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateSellerDto, UpdateSellerDto } from './dto/seller.dto';

@Controller('sellers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.sellersService.findAll(req.user.tenantId);
  }

  @Post()
  async create(@Body() data: CreateSellerDto, @Req() req: any) {
    return this.sellersService.create({
      ...data,
      tenantId: req.user.tenantId,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateSellerDto,
    @Req() req: any,
  ) {
    return this.sellersService.update(id, req.user.tenantId, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.sellersService.remove(id, req.user.tenantId);
  }
}
