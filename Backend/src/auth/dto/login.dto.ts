import { IsEmail, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';
import { NormalizeEmail } from '../../common/validators/normalize-email.transform';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}
