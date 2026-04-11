import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterResponseDto {
  @ApiProperty({
    example: 'ba81e123-5a83-40c8-9ef4-b1094681febf',
  })
  id: string;

  @ApiProperty({
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    example: '2026-04-11T09:31:21.679Z',
  })
  createdAt: Date;
}
