import { CurrentUser } from '@app/authorization/decorators/current-user.decorator';
import { RoleRequired } from '@app/authorization/decorators/role-required.decorator';
import { JwtAuthGuard } from '@app/authorization/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@app/authorization/guards/optional-jwt-auth.guard';
import { UserInfo } from '@app/authorization/model/user-info';
import { AddCharacterRequestDto } from '@app/shared/dto/characters/add-character-request.dto';
import { CharacterContentDto } from '@app/shared/dto/characters/character-content.dto';
import { CharacterProfileFilterDto } from '@app/shared/dto/characters/character-profile-filter.dto';
import { CharacterProfileDto } from '@app/shared/dto/characters/character-profile.dto';
import { CharacterRefreshResultDto } from '@app/shared/dto/characters/character-refresh-result.dto';
import { CharacterRegistrationStatusResultDto } from '@app/shared/dto/characters/character-registration-status-result.dto';
import { CharacterSummaryDto } from '@app/shared/dto/characters/character-summary.dto';
import { IdWrapper } from '@app/shared/dto/common/id-wrapper.dto';
import { PagingResultDto } from '@app/shared/dto/common/paging-result.dto';
import { ImageDto } from '@app/shared/dto/image/image.dto';
import { MyContentDto } from '@app/shared/dto/characters/my-content.dto';
import { SessionCharacterDto } from '@app/shared/dto/user/session-character.dto';
import { Role } from '@app/shared/enums/role.enum';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ImagesService } from '../images/images.service';
import { StoriesService } from '../stories/stories.service';
import { CharactersService } from './characters.service';
import { MyContentService } from './my-content.service';
import { SiteRegion } from '@app/shared/enums/region.enum';
import { ClientRegion } from 'apps/chaosarchives/src/common/client-region.decorator';

@Controller('characters')
export class CharactersController {
  constructor(
    private charactersService: CharactersService,
    private storiesService: StoriesService,
    private imagesService: ImagesService,
    private myContentService: MyContentService,
  ) {}

  @Get('profile/:server/:name')
  @UseGuards(OptionalJwtAuthGuard)
  async getCharacterProfile(
    @Param('name') name: string,
    @Param('server') server: string,
    @CurrentUser() user?: UserInfo,
  ): Promise<CharacterProfileDto> {
    return this.charactersService.getCharacterProfile(name, server, user);
  }

  @Put('profile')
  @RoleRequired(Role.USER)
  async saveCharacter(@Body() profile: CharacterProfileDto, @CurrentUser() user: UserInfo): Promise<void> {
    await this.charactersService.saveCharacter(profile, user);
  }

  @Get()
  async getCharacterList(@ClientRegion() region: SiteRegion, @Query() filter: CharacterProfileFilterDto): Promise<PagingResultDto<CharacterSummaryDto>> {
    return this.charactersService.getCharacterList(region, filter);
  }

  @Post()
  @RoleRequired(Role.USER)
  async addAccountCharacter(
    @Body() request: AddCharacterRequestDto,
    @CurrentUser() user: UserInfo,
    @ClientRegion() region: SiteRegion,
  ): Promise<SessionCharacterDto> {
    return this.charactersService.addAccountCharacter(request, user, region);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
  async refreshCharacter(
    @Body() characterId: IdWrapper,
    @CurrentUser() user: UserInfo,
  ): Promise<CharacterRefreshResultDto> {
    return this.charactersService.refreshCharacter(characterId, user);
  }

  @Get(':id/content')
  async getCharacterContent(@Param('id', ParseIntPipe) characterId: number): Promise<CharacterContentDto> {
    const [stories, images] = await Promise.all([
      this.storiesService.getStoryList(SiteRegion.GLOBAL, { characterId }),
      this.imagesService.getImages(SiteRegion.GLOBAL, { characterId }),
    ]);

    return {
      stories: stories.data,
      images: images.data,
    };
  }

  @Get(':id/my-images')
  @RoleRequired(Role.USER)
  async getMyImages(
    @Param('id', ParseIntPipe) characterId: number,
    @CurrentUser() user: UserInfo,
  ): Promise<ImageDto[]> {
    return this.imagesService.getMyImages(characterId, user);
  }

  @Get(':id/my-content')
  @RoleRequired(Role.USER)
  async getMyContent(
    @Param('id', ParseIntPipe) characterId: number,
    @CurrentUser() user: UserInfo,
  ): Promise<MyContentDto> {
    return this.myContentService.getMyContent(characterId, user);
  }

  @Get('registration-status')
  @UseGuards(OptionalJwtAuthGuard)
  async getRegistrationStatus(
    @Query('name') name: string,
    @Query('lodestoneId', ParseIntPipe) lodestoneId: number,
    @CurrentUser() user?: UserInfo,
  ): Promise<CharacterRegistrationStatusResultDto> {
    return this.charactersService.getRegistrationStatus(name, lodestoneId, user);
  }
}
