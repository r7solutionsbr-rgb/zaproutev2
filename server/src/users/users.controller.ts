import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Listar usuários da empresa' })
  @Get()
  async findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Criar novo usuário' })
  @Post()
  async create(@Request() req: any, @Body() data: CreateUserDto) {
    return this.usersService.create({ ...data, tenantId: req.user.tenantId });
  }

  @ApiOperation({ summary: 'Atualizar usuário' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: UpdateUserDto) {
    return this.usersService.update(id, data);
  }

  @ApiOperation({ summary: 'Remover usuário' })
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
