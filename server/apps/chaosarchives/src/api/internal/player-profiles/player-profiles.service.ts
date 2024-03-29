import { UserInfo } from '@app/authorization/model/user-info';
import { Character, User } from '@app/entity';
import { PlayerProfileEditDto } from '@app/shared/dto/player-profiles/player-profile-edit.dto';
import { PlayerProfileDto } from '@app/shared/dto/player-profiles/player-profile.dto';
import { SiteRegion, asRegionOrThrow } from '@app/shared/enums/region.enum';
import { Role } from '@app/shared/enums/role.enum';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { checkCarrdProfile } from 'apps/chaosarchives/src/common/api-checks';
import { DataSource, FindOptionsWhere, Not, Repository } from 'typeorm';

@Injectable()
export class PlayerProfilesService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Character) private characterRepo: Repository<Character>,
    private dataSource: DataSource,
  ) {}

  async getPlayerProfile(userId: number, region: SiteRegion): Promise<PlayerProfileDto> {
    const user = await this.userRepo.findOne({
      where: {
        id: userId,
				role: Not(Role.UNVERIFIED),
        publicPlayerProfile: true,
      },
      select: ['id', 'playerName', 'playerProfile', 'carrdProfile'],
    });

    if (!user) {
      throw new NotFoundException('Player profile not found.');
    }

    const charactersWhere: FindOptionsWhere<Character> = {
      user: {
        id: userId,
      },
      showInPlayerProfile: true,
    };

    if (region !== SiteRegion.GLOBAL) {
      charactersWhere.server = {
        region: asRegionOrThrow(region),
      };
    }

		const characters = await this.characterRepo.find({
			where: charactersWhere,
			order: {
				'name': 'ASC',
			},
			relations: [ 'server' ],
			select: [ 'id', 'name', 'occupation', 'race', 'avatar', 'server' ]
		});

		return {
			name: user.playerName,
			content: user.playerProfile,
			carrdProfile: user.carrdProfile,
			characters: characters.map(character => ({
				name: character.name,
        occupation: character.occupation,
				race: character.race,
				avatar: character.avatar,
				server: character.server.name,
			})),
		};
  }

	async createOwnPlayerProfile(userInfo: UserInfo, region: SiteRegion): Promise<PlayerProfileDto> {
		await this.dataSource.transaction(async (em) => {
			const userRepo = em.getRepository(User);
			const user = await userRepo.findOne({
				where: {
					id: userInfo.id,
					role: Not(Role.UNVERIFIED),
				},
				select: ['id', 'publicPlayerProfile', 'playerName', 'playerProfile', 'carrdProfile'],
			});

			if (!user) {
				throw new NotFoundException("Cannot find you - this shouldn't be possible");
			}

			user.publicPlayerProfile = true;

			if (!user.playerName) {
				user.playerName = userInfo.characters[0].name;
			}

			await userRepo.save(user);
    });

		return this.getPlayerProfile(userInfo.id, region);
	}

  async updateOwnPlayerProfile(playerProfileDto: PlayerProfileEditDto, userInfo: UserInfo): Promise<void> {
    checkCarrdProfile(playerProfileDto.carrdProfile, userInfo);

		await this.dataSource.transaction(async (em) => {
			const userRepo = em.getRepository(User);
			const user = await userRepo.findOne({
				where: {
					id: userInfo.id,
					role: Not(Role.UNVERIFIED),
				},
				select: ['id', 'playerName', 'playerProfile', 'carrdProfile'],
			});

			if (!user) {
				throw new NotFoundException("Cannot find you - this shouldn't be possible");
			}

      Object.assign(user, <Partial<User>>{
				publicPlayerProfile: true,
				playerName: playerProfileDto.name,
				playerProfile: playerProfileDto.content,
				carrdProfile: playerProfileDto.carrdProfile,
			});

			await userRepo.save(user);
    });
  }

  async deleteOwnPlayerProfile(userInfo: UserInfo): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em.getRepository(User).update(
        {
          id: userInfo.id,
					publicPlayerProfile: true,
        },
        {
          publicPlayerProfile: false,
        },
      );
    });
  }
}
