import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import { RoleRequired } from '@app/auth/decorators/role-required.decorator';
import { OptionalJwtAuthGuard } from '@app/auth/guards/optional-jwt-auth.guard';
import { UserInfo } from '@app/auth/model/user-info';
import { IdWrapper } from '@app/shared/dto/common/id-wrapper.dto';
import { CommunityMemberDto } from '@app/shared/dto/communities/community-member.dto';
import { CommunitySummaryDto } from '@app/shared/dto/communities/community-summary.dto';
import { CommunityDto } from '@app/shared/dto/communities/community.dto';
import { MyCommunitySummaryDto } from '@app/shared/dto/communities/my-community-summary.dto';
import { Role } from '@app/shared/enums/role.enum';
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CommunitiesService } from './communities.service';

@Controller('communities')
export class CommunitiesController {
	constructor(private communitiesService: CommunitiesService) { }

	@Get('my-communities')
	@RoleRequired(Role.USER)
	async getMyCommunities(@Query('characterId', ParseIntPipe) characterId: number, @CurrentUser() user: UserInfo): Promise<MyCommunitySummaryDto[]> {
		return this.communitiesService.getMyCommunities(characterId, user);
	}

	@Get(':id/members')
	@RoleRequired(Role.USER)
	async getCommunityMembers(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserInfo): Promise<CommunityMemberDto[]> {
		return this.communitiesService.getCommunityMembers(id, user);
	}

	@Get()
	async getCommunities(): Promise<CommunitySummaryDto[]> {
		return this.communitiesService.getCommunities({}, false);
	}

	@Get('by-name/:name')
	@UseGuards(OptionalJwtAuthGuard)
	async getCommunityByName(@Param('name') name: string, @Query('characterId', ParseIntPipe) characterId?: number, @CurrentUser() user?: UserInfo): Promise<CommunityDto> {
		return this.communitiesService.getCommunityByName(name, characterId, user);
	}

	@Get(':id')
	@UseGuards(OptionalJwtAuthGuard)
	async getCommunity(@Param('id', ParseIntPipe) id: number, @Query('characterId', ParseIntPipe) characterId?: number, @CurrentUser() user?: UserInfo): Promise<CommunityDto> {
		return this.communitiesService.getCommunity(id, characterId, user);
	}

	@Post()
	@RoleRequired(Role.USER)
	async createCommunity(@Body() community: CommunityDto, @CurrentUser() user: UserInfo): Promise<IdWrapper> {
		return this.communitiesService.createCommunity(community, user);
	}

	@Put(':id')
	@RoleRequired(Role.USER)
	async editCommunity(@Param('id', ParseIntPipe) id: number, @Body() community: CommunityDto, @CurrentUser() user: UserInfo): Promise<void> {
		// eslint-disable-next-line no-param-reassign
		community.id = id;
		await this.communitiesService.editCommunity(community, user);
	}

	@Delete(':id')
	@RoleRequired(Role.USER)
	async deleteCommunity(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: UserInfo): Promise<void> {
		return this.communitiesService.deleteCommunity(id, user);
	}
}
