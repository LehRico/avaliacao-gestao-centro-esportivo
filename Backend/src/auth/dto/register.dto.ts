import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}
