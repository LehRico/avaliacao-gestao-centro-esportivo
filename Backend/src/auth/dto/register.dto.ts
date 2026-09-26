import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';
import { IsNotOnlyDigits } from '../../common/validators/is-not-only-digits.validator';
import { NormalizeEmail } from '../../common/validators/normalize-email.transform';
import { Trim } from '../../common/validators/trim.transform';

export class RegisterDto {
  @Trim()
  @IsString()
  @MinLength(2)
  @IsNotOnlyDigits()
  name: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword()
  password: string;
}
