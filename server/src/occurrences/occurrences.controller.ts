import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Occurrences')
@ApiBearerAuth()
@Controller('occurrences')
@UseGuards(JwtAuthGuard)
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @ApiOperation({ summary: 'Listar ocorrências paginadas' })
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
