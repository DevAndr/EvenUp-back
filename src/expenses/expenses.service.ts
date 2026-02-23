import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, SplitDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

const EXPENSE_INCLUDE = {
  paidBy: { select: { id: true, name: true, username: true } },
  splits: true,
} as const;

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, groupId: string) {
    await this.checkMembership(userId, groupId);

    return this.prisma.expense.findMany({
      where: { groupId },
      include: EXPENSE_INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  async create(userId: string, groupId: string, dto: CreateExpenseDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundException('Group not found');

    const memberIds = new Set(group.members.map((m) => m.userId));

    if (!memberIds.has(userId)) {
      throw new ForbiddenException('You are not a member of this group');
    }

    const paidById = dto.paidById ?? userId;

    if (!memberIds.has(paidById)) {
      throw new BadRequestException('paidById must be a group member');
    }

    const splits = dto.splits
      ? this.validateSplits(dto.splits, dto.amount, memberIds)
      : this.buildEqualSplits(group.members.map((m) => m.userId), dto.amount);

    return this.prisma.expense.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : undefined,
        paidById,
        groupId,
        splits: { create: splits },
      },
      include: EXPENSE_INCLUDE,
    });
  }

  async update(
    userId: string,
    groupId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ) {
    const expense = await this.findExpenseInGroup(expenseId, groupId);
    await this.checkMembership(userId, groupId);

    // Если меняем сумму или доли — пересчитываем сплиты
    const newAmount = dto.amount ?? Number(expense.amount);

    let splitsData: SplitDto[] | undefined;

    if (dto.splits) {
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });
      const memberIds = new Set(group!.members.map((m) => m.userId));
      splitsData = this.validateSplits(dto.splits, newAmount, memberIds);
    } else if (dto.amount && !dto.splits) {
      // Сумма изменилась, но новые доли не переданы — пересчитываем равномерно
      const currentSplits = await this.prisma.expenseSplit.findMany({
        where: { expenseId },
      });
      const userIds = currentSplits.map((s) => s.userId);
      splitsData = this.buildEqualSplits(userIds, dto.amount);
    }

    return this.prisma.$transaction(async (tx) => {
      if (splitsData) {
        await tx.expenseSplit.deleteMany({ where: { expenseId } });
        await tx.expenseSplit.createMany({
          data: splitsData.map((s) => ({ ...s, expenseId })),
        });
      }

      return tx.expense.update({
        where: { id: expenseId },
        data: {
          description: dto.description,
          amount: dto.amount,
          category: dto.category,
          date: dto.date ? new Date(dto.date) : undefined,
          paidById: dto.paidById,
        },
        include: EXPENSE_INCLUDE,
      });
    });
  }

  async remove(userId: string, groupId: string, expenseId: string) {
    await this.findExpenseInGroup(expenseId, groupId);
    await this.checkMembership(userId, groupId);

    await this.prisma.expense.delete({ where: { id: expenseId } });

    return { message: 'Expense deleted' };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async checkMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) throw new ForbiddenException('You are not a member of this group');
  }

  private async findExpenseInGroup(expenseId: string, groupId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    return expense;
  }

  private validateSplits(
    splits: SplitDto[],
    expenseAmount: number,
    memberIds: Set<string>,
  ): SplitDto[] {
    for (const split of splits) {
      if (!memberIds.has(split.userId)) {
        throw new BadRequestException(
          `User ${split.userId} is not a group member`,
        );
      }
    }

    const splitsSum = splits.reduce((acc, s) => acc + s.amount, 0);
    if (Math.abs(splitsSum - expenseAmount) > 0.01) {
      throw new BadRequestException(
        `Splits sum (${splitsSum}) must equal expense amount (${expenseAmount})`,
      );
    }

    return splits;
  }

  private buildEqualSplits(userIds: string[], amount: number): SplitDto[] {
    const splitAmount = amount / userIds.length;
    return userIds.map((userId) => ({ userId, amount: splitAmount }));
  }
}
