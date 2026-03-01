import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { PaginatedResponseDto } from '../common/dto/response.dto';

@ApiTags('Occurrences')
@ApiBearerAuth()
@Controller('occurrences')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @ApiOperation({ summary: 'Listar ocorrências paginadas' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  @Get('paginated')
  async findAllPaginated(
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.occurrencesService.findAllPaginated(
      req.user.tenantId,
      paginationDto,
    );
  }
}
