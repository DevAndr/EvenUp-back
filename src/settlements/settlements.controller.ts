import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { SettlementsService } from './settlements.service';

@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
  ) {
    return this.settlementsService.findAll(user.id, groupId);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Body() dto: CreateSettlementDto,
  ) {
    return this.settlementsService.create(user.id, groupId, dto);
  }

  @Patch(':settlementId/confirm')
  confirm(
    @CurrentUser() user: CurrentUserPayload,
    @Param('groupId') groupId: string,
    @Param('settlementId') settlementId: string,
  ) {
    return this.settlementsService.confirm(user.id, groupId, settlementId);
  }
}
