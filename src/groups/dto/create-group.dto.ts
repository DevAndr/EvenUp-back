import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum SplitTypeEnum {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
}

export class CreateGroupDto {
  @IsString()
  @MaxLength(64)
  name: string;

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
