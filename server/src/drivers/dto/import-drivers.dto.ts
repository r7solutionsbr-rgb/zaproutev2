import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDriverDto } from './driver.dto';

export class ImportDriversDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDriverDto)
  drivers: CreateDriverDto[];
}