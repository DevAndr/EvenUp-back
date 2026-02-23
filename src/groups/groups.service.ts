import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { simplifyDebts } from '../common/utils/debt.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

const OWNER_SELECT = { id: true, name: true, username: true } as const;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        owner: { select: OWNER_SELECT },
        _count: { select: { members: true, expenses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        ...dto,
        ownerId: userId,
        members: { create: { userId } },
      },
      include: {
        owner: { select: OWNER_SELECT },
        _count: { select: { members: true } },
      },
    });
  }

  async findOne(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: { select: OWNER_SELECT },
        members: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        },
        expenses: {
          orderBy: { date: 'desc' },
          include: {
            paidBy: { select: OWNER_SELECT },
            splits: true,
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    if (!group.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('You are not a member of this group');
    }

    return group;
  }

  async update(userId: string, groupId: string, dto: UpdateGroupDto) {
    await this.checkOwnership(userId, groupId);

    return this.prisma.group.update({
      where: { id: groupId },
      data: dto,
      include: {
        owner: { select: OWNER_SELECT },
        _count: { select: { members: true } },
      },
    });
  }

  async archive(userId: string, groupId: string) {
    await this.checkOwnership(userId, groupId);

    return this.prisma.group.update({
      where: { id: groupId },
      data: { status: 'ARCHIVED' },
      select: { id: true, status: true },
    });
  }

  async join(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { where: { userId } } },
    });

    if (!group) throw new NotFoundException('Group not found');

    if (group.status === 'ARCHIVED') {
      throw new ForbiddenException('Cannot join an archived group');
    }

    if (group.members.length > 0) {
      throw new ConflictException('You are already a member of this group');
    }

    await this.prisma.groupMember.create({ data: { groupId, userId } });

    return { message: 'Joined successfully' };
  }

  async getBalances(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        expenses: { include: { splits: true } },
        settlements: { where: { status: 'CONFIRMED' } },
      },
    });

    if (!group) throw new NotFoundException('Group not found');

    if (!group.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Вычисляем чистый баланс каждого пользователя
    const balanceMap = new Map<string, number>();
    const get = (uid: string) => balanceMap.get(uid) ?? 0;

    for (const expense of group.expenses) {
      // Тот, кто платил — ему должны
      balanceMap.set(expense.paidById, get(expense.paidById) + Number(expense.amount));
      // Каждый участник трат — должен свою долю
      for (const split of expense.splits) {
        balanceMap.set(split.userId, get(split.userId) - Number(split.amount));
      }
    }

    // Учитываем подтверждённые переводы
    for (const settlement of group.settlements) {
      const amount = Number(settlement.amount);
      // fromUser уже заплатил → его долг уменьшился
      balanceMap.set(settlement.fromUserId, get(settlement.fromUserId) + amount);
      // toUser получил деньги → его кредит уменьшился
      balanceMap.set(settlement.toUserId, get(settlement.toUserId) - amount);
    }

    const balances = [...balanceMap.entries()].map(([uid, balance]) => ({
      userId: uid,
      balance: Math.round(balance * 100) / 100,
    }));

    const transfers = simplifyDebts(balances);

    return { balances, transfers };
  }

  private async checkOwnership(userId: string, groupId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });

    if (!group) throw new NotFoundException('Group not found');

    if (group.ownerId !== userId) {
      throw new ForbiddenException('Only the group owner can perform this action');
    }
  }
}
