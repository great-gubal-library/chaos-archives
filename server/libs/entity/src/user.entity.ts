import { Role } from '@app/shared/enums/role.enum';
import { Column, Entity } from 'typeorm';
import { BasicEntity } from './basic.entity';

@Entity()
export class User extends BasicEntity {
  @Column({
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({
    nullable: false,
  })
  passwordHash: string;

  @Column({
    type: 'datetime',
    nullable: true
  })
  tokensValidAfter: Date | null;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.UNVERIFIED,
    nullable: false,
  })
  role: Role | null;

  @Column({
    nullable: true
  })
  verifiedAt: Date;

  @Column({
    type: 'varchar',
    nullable: true
  })
  verificationCode: string|null;

  @Column({
    type: 'varchar',
    nullable: true
  })
  newEmail: string|null;

  @Column({
    type: 'varchar',
    nullable: true
  })
  newEmailVerificationCode: string|null;

  @Column({
    nullable: false,
    default: false,
  })
  publicPlayerProfile: boolean;

  @Column({
    type: 'varchar',
    nullable: false,
    default: ''
  })
  playerName: string;

  @Column({
    type: 'mediumtext',
    nullable: false,
    default: ''
  })
  playerProfile: string;

  @Column({
    nullable: false,
    width: 100,
    default: '',
  })
  carrdProfile: string;

  @Column({
    nullable: false,
    default: false,
  })
  use2FA: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
    width: 40,
  })
  totpSecret: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    width: 16,
  })
  backupCode: string | null;
}
