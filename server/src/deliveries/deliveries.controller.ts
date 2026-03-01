import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DeliveriesService } from './deliveries.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @ApiOperation({ summary: 'Listar entregas paginadas' })
  @Get('paginated')
  async findAllPaginated(
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ) {
    if (req.user.driverId) {
      paginationDto.driverId = req.user.driverId;
    }
    return this.deliveriesService.findAllPaginated(
      req.user.tenantId,
      paginationDto,
    );
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.deliveriesService.findOne(id, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Confirmar entrega com comprovante e assinatura' })
  @Post(':id/confirm')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'signature', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  async confirmDelivery(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; signature?: Express.Multer.File[] },
  ) {
    const proofUrl = files.file ? `/uploads/${files.file[0].filename}` : null;
    const signatureUrl = files.signature
      ? `/uploads/${files.signature[0].filename}`
      : null;

    return this.deliveriesService.confirmDelivery(
      id,
      req.user.tenantId,
      proofUrl,
      signatureUrl,
    );
  }

  @ApiOperation({ summary: 'Registrar ocorrência/falha na entrega' })
  @Post(':id/fail')
  async failDelivery(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.deliveriesService.failDelivery(
      id,
      req.user.tenantId,
      body.reason,
    );
  }
}
