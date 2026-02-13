import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({
    example: 'Desserts',
    description: 'Group name (unique per user)',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Sweet recipes for special occasions',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
