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
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({
    status: 409,
    description: 'Group with this name already exists for user',
  })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user groups with recipe count' })
  @ApiResponse({ status: 200, description: 'List of user groups' })
  findAll(@CurrentUser() user: { id: string }) {
    return this.groupsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details with recipes' })
  @ApiResponse({ status: 200, description: 'Group details with recipes' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.groupsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({
    status: 409,
    description: 'Group with this name already exists',
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.id, dto);
  }

  @Get(':id/confirm-delete')
  @ApiOperation({ summary: 'Preview recipes that will be deleted with the group' })
  @ApiResponse({ status: 200, description: 'List of recipes that will be deleted' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  confirmDelete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.groupsService.findRecipesToDelete(id, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete group and all its associated recipes' })
  @ApiResponse({ status: 204, description: 'Group and recipes deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.groupsService.remove(id, user.id);
  }
}
