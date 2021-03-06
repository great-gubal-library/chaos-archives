import { Character, User } from '@app/entity';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@app/auth/auth.module';
import { CharactersModule } from '../characters/characters.module';
import { MailModule } from '../../../mail/mail.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Character]),
    HttpModule,
    MailModule,
    AuthModule,
    CharactersModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
