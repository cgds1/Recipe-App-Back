import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateGroupDto) {
    try {
      return await this.prisma.group.create({
        data: {
          ...dto,
          userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'You already have a group with this name',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Record not found');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Foreign key constraint failed');
        }
      }
      throw error;
    }
  }

  async findAll(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { recipes: true } },
      },
    });

    return groups.map(({ _count, ...group }) => ({
      ...group,
      recipeCount: _count.recipes,
    }));
  }

  async findOne(id: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, userId },
      include: {
        recipes: {
          include: {
            recipe: {
              include: {
                ingredients: { orderBy: { order: 'asc' } },
                steps: { orderBy: { order: 'asc' } },
              },
            },
          },
          orderBy: { recipe: { title: 'asc' } },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    const { recipes: recipeGroups, ...groupData } = group;
    return {
      ...groupData,
      recipes: recipeGroups.map((rg) => rg.recipe),
    };
  }

  async update(id: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findFirst({
      where: { id, userId },
    });
    if (!group) throw new NotFoundException('Group not found');

    try {
      return await this.prisma.group.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'You already have a group with this name',
          );
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Record not found');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Foreign key constraint failed');
        }
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id, userId },
    });

    if (!group) throw new NotFoundException('Group not found');

    await this.prisma.group.delete({ where: { id } });
  }
}
