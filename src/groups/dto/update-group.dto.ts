import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SplitTypeEnum } from './create-group.dto';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  emoji?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsEnum(SplitTypeEnum)
  splitType?: SplitTypeEnum;
}
