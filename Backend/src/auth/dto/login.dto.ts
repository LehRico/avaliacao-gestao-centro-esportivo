import { IsEmail, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}
