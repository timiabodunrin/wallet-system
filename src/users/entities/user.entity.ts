import { Entity, Column, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Wallet } from '../../wallet/entities/wallet.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true, select: false })
  refreshToken: string | null;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;
}
