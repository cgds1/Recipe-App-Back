import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CreateIngredientDto {
  @ApiProperty({ example: 'Flour' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '500' })
  @IsString()
  @IsNotEmpty()
  quantity: string;

  @ApiProperty({ example: 'grams', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

class CreateStepDto {
  @ApiProperty({ example: 'Mix all dry ingredients' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;
}

export class CreateRecipeDto {
  @ApiProperty({
    example: 'Chocolate Cake',
    description: 'Recipe title (unique per user)',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Delicious homemade chocolate cake',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CreateIngredientDto], description: 'List of ingredients' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIngredientDto)
  ingredients: CreateIngredientDto[];

  @ApiProperty({ type: [CreateStepDto], description: 'List of preparation steps' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStepDto)
  steps: CreateStepDto[];

  @ApiProperty({
    example: ['uuid1', 'uuid2'],
    required: false,
    description: 'Group IDs to associate',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];
}

export class AddToGroupsDto {
  @ApiProperty({
    example: ['uuid1', 'uuid2'],
    description: 'Group IDs to associate',
  })
  @IsArray()
  @IsString({ each: true })
  groupIds: string[];
}
