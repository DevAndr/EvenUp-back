import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

const USER_SELECT = { id: true, name: true, username: true } as const;

const SETTLEMENT_INCLUDE = {
  fromUser: { select: USER_SELECT },
  toUser: { select: USER_SELECT },
} as const;

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, groupId: string) {
    await this.checkMembership(userId, groupId);

    return this.prisma.settlement.findMany({
      where: { groupId },
      include: SETTLEMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, groupId: string, dto: CreateSettlementDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundException('Group not found');

    const memberIds = new Set(group.members.map((m) => m.userId));

    if (!memberIds.has(userId)) {
      throw new ForbiddenException('You are not a member of this group');
    }

    if (!memberIds.has(dto.toUserId)) {
      throw new BadRequestException('toUserId must be a group member');
    }

    if (dto.toUserId === userId) {
      throw new BadRequestException('Cannot create a settlement to yourself');
    }

    return this.prisma.settlement.create({
      data: {
        groupId,
        fromUserId: userId,
        toUserId: dto.toUserId,
        amount: dto.amount,
        note: dto.note,
      },
      include: SETTLEMENT_INCLUDE,
    });
  }

  async confirm(userId: string, groupId: string, settlementId: string) {
    await this.checkMembership(userId, groupId);

    const settlement = await this.prisma.settlement.findFirst({
      where: { id: settlementId, groupId },
    });

    if (!settlement) throw new NotFoundException('Settlement not found');

    if (settlement.status === 'CONFIRMED') {
      throw new BadRequestException('Settlement is already confirmed');
    }

    return this.prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'CONFIRMED',
        settledAt: new Date(),
      },
      include: SETTLEMENT_INCLUDE,
    });
  }

  private async checkMembership(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });

    if (!member) throw new ForbiddenException('You are not a member of this group');
  }
}
