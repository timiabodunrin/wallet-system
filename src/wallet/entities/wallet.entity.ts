import { ApiHideProperty } from '@nestjs/swagger';
import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Index(['userId'])
@Entity('wallets')
export class Wallet extends BaseEntity {
  @ApiHideProperty()
  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn()
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: string;

  @Column({ default: 'NGN' })
  currency: string;
}
