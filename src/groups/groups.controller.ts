import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../common/decorators/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.groupsService.findAll(user.id);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') groupId: string,
  ) {
    return this.groupsService.findOne(user.id, groupId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(user.id, groupId, dto);
  }

  @Delete(':id')
  archive(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') groupId: string,
  ) {
    return this.groupsService.archive(user.id, groupId);
  }

  @Post(':id/join')
  join(@CurrentUser() user: CurrentUserPayload, @Param('id') groupId: string) {
    return this.groupsService.join(user.id, groupId);
  }

  @Get(':id/balances')
  getBalances(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') groupId: string,
  ) {
    return this.groupsService.getBalances(user.id, groupId);
  }
}
