import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto, AddToGroupsDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Recipes')
@ApiBearerAuth()
@Controller('recipes')
export class RecipesController {
  constructor(private recipesService: RecipesService) {}

  @Post()
  @ApiOperation({ summary: 'Create new recipe' })
  @ApiResponse({ status: 201, description: 'Recipe created successfully' })
  @ApiResponse({
    status: 409,
    description: 'Recipe with this title already exists for user',
  })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateRecipeDto) {
    return this.recipesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all recipes (alphabetically ordered)' })
  @ApiResponse({ status: 200, description: 'List of all recipes' })
  findAll() {
    return this.recipesService.findAll();
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Get current user recipes (alphabetically ordered)',
  })
  @ApiResponse({ status: 200, description: 'List of user recipes' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.recipesService.findMine(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get recipe details with ingredients, steps and groups',
  })
  @ApiResponse({ status: 200, description: 'Recipe details' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update recipe (author only)' })
  @ApiResponse({ status: 200, description: 'Recipe updated successfully' })
  @ApiResponse({ status: 403, description: 'Not the recipe author' })
  @ApiResponse({
    status: 409,
    description: 'Recipe with this title already exists',
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete recipe (author only)' })
  @ApiResponse({ status: 204, description: 'Recipe deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not the recipe author' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.recipesService.remove(id, user.id);
  }

  @Post(':id/groups')
  @ApiOperation({ summary: 'Associate recipe to groups' })
  @ApiResponse({ status: 200, description: 'Recipe associated to groups' })
  addToGroups(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddToGroupsDto,
  ) {
    return this.recipesService.addToGroups(id, user.id, dto.groupIds);
  }

  @Delete(':id/groups/:groupId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove recipe from group (does not delete recipe)',
  })
  @ApiResponse({ status: 204, description: 'Recipe removed from group' })
  removeFromGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.recipesService.removeFromGroup(id, groupId, user.id);
  }
}
