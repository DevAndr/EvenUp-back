import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum CategoryIdEnum {
  FOOD = 'FOOD',
  TAXI = 'TAXI',
  GROCERY = 'GROCERY',
  HOME = 'HOME',
  MUSIC = 'MUSIC',
  PLANE = 'PLANE',
  OTHER = 'OTHER',
}

export class SplitDto {
  @IsString()
  userId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}

export class CreateExpenseDto {
  @IsString()
  @MaxLength(255)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsEnum(CategoryIdEnum)
  category?: CategoryIdEnum;

  @IsOptional()
  @IsDateString()
  date?: string;

  // Кто платил. Если не указан — текущий пользователь
  @IsOptional()
  @IsString()
  paidById?: string;

  // Если не указан — равные доли между всеми участниками группы
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitDto)
  splits?: SplitDto[];
}
