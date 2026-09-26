import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '../../common/validators/normalize-email.transform';

export class AddMemberDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
