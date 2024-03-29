import { Character, User } from '@app/entity';
import { Role } from '@app/shared/enums/role.enum';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import { UserCharacterInfo } from '../model/user-character-info';
import { UserInfo } from '../model/user-info';

@Injectable()
export class AuthorizationImplService {
  private readonly USER_INFO_CACHE_SEC = 86400;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Character)
    private readonly characterRepo: Repository<Character>,
    private readonly dataSource: DataSource,
    @InjectRedis()
    private readonly redisService: Redis,
  ) {}

  async getUserInfo(userId: number): Promise<UserInfo> {
    const cachedInfo = await this.redisService.get(`user_${userId}`);

    if (cachedInfo) {
      return JSON.parse(cachedInfo);
    }

    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.getAndCacheUserInfo(user);
  }

  private async getAndCacheUserInfo(user: User): Promise<UserInfo> {
    const characters = await this.characterRepo.find({
      where: {
        user: {
          id: user.id,
        },
      },
      relations: [ 'server' ],
    });

    if (characters.length === 0) {
      // Shouldn't happen
      throw new UnauthorizedException();
    }

    const result = new UserInfo({
      id: user.id,
      role: user.role as Role,
      characters: characters.map(character => new UserCharacterInfo({
        id: character.id,
        lodestoneId: character.lodestoneId,
        name: character.name,
        server: character.server.name,
        region: character.server.region,
        avatar: character.avatar,
        race: character.race,
        newsRole: character.newsRole,
        newsPseudonym: character.newsPseudonym,
        verified: character.verifiedAt !== null
      })),
      tokensValidAfter: user.tokensValidAfter? user.tokensValidAfter.getTime() : null,
    });

    void this.redisService.set(
      `user_${user.id}`,
      JSON.stringify(result),
      'EX',
      this.USER_INFO_CACHE_SEC,
    );
    return result;
  }

  async notifyUserChanged(userId: number): Promise<void> {
    try {
		  await this.redisService.del(`user_${userId}`);
    } catch (e) {
      // Do nothing
    }
	}
}
