import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateRecipeDto) {
    try {
      const recipe = await this.prisma.recipe.create({
        data: {
          title: dto.title,
          description: dto.description,
          userId,
          ingredients: {
            create: dto.ingredients,
          },
          steps: {
            create: dto.steps,
          },
          ...(dto.groupIds?.length && {
            groups: {
              create: dto.groupIds.map((groupId) => ({ groupId })),
            },
          }),
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          steps: { orderBy: { order: 'asc' } },
          groups: { include: { group: true } },
        },
      });
      return recipe;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'You already have a recipe with this title',
          );
        }
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.recipe.findMany({
      orderBy: { title: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ingredients: { orderBy: { order: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.recipe.findMany({
      where: { userId },
      orderBy: { title: 'asc' },
      include: {
        ingredients: { orderBy: { order: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
        groups: { include: { group: true } },
      },
    });
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ingredients: { orderBy: { order: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
        groups: { include: { group: true } },
      },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    return recipe;
  }

  async update(id: string, userId: string, dto: UpdateRecipeDto) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You are not the author of this recipe');
    }

    try {
      const updated = await this.prisma.recipe.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.ingredients && {
            ingredients: {
              deleteMany: {},
              create: dto.ingredients,
            },
          }),
          ...(dto.steps && {
            steps: {
              deleteMany: {},
              create: dto.steps,
            },
          }),
        },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          steps: { orderBy: { order: 'asc' } },
          groups: { include: { group: true } },
        },
      });
      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'You already have a recipe with this title',
          );
        }
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You are not the author of this recipe');
    }

    await this.prisma.recipe.delete({ where: { id } });
  }

  async addToGroups(recipeId: string, userId: string, groupIds: string[]) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You are not the author of this recipe');
    }

    const groups = await this.prisma.group.findMany({
      where: { id: { in: groupIds }, userId },
    });
    if (groups.length !== groupIds.length) {
      throw new NotFoundException(
        'One or more groups not found or do not belong to you',
      );
    }

    await this.prisma.recipeGroup.createMany({
      data: groupIds.map((groupId) => ({ recipeId, groupId })),
      skipDuplicates: true,
    });

    return this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: { orderBy: { order: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
        groups: { include: { group: true } },
      },
    });
  }

  async removeFromGroup(recipeId: string, groupId: string, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!recipe) throw new NotFoundException('Recipe not found');
    if (recipe.userId !== userId) {
      throw new ForbiddenException('You are not the author of this recipe');
    }

    await this.prisma.recipeGroup.delete({
      where: { recipeId_groupId: { recipeId, groupId } },
    });
  }
}
