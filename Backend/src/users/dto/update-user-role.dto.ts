import { IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsIn(['USER', 'ORGANIZER', 'ADMIN'])
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
}
