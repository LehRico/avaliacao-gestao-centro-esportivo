import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const SEQUENTIAL_ALPHABETS = ['abcdefghijklmnopqrstuvwxyz', '0123456789'];

function isEntirelySequential(password: string): boolean {
  const normalized = password.toLowerCase();

  return SEQUENTIAL_ALPHABETS.some((alphabet) => {
    const ascending = alphabet.includes(normalized);
    const descending = alphabet.split('').reverse().join('').includes(normalized);
    return ascending || descending;
  });
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          if (value.length < 8) {
            return false;
          }

          if (/ {2,}/.test(value)) {
            return false;
          }

          if (!/[a-zA-Z0-9]/.test(value)) {
            return false;
          }

          if (isEntirelySequential(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return (
            `${args.property} deve ter no mínimo 8 caracteres, não pode ser ` +
            'inteiramente sequencial (ex: "12345678", "abcdefgh"), não pode ' +
            'conter espaços duplos e não pode ser composta apenas por ' +
            'caracteres especiais.'
          );
        },
      },
    });
  };
}
