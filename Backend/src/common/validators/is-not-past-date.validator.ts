import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Garante que uma data (string ISO 8601, já normalizada por
 * ParseFlexibleDate quando aplicável) não é anterior ao momento atual.
 */
export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotPastDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return false;
          }

          return date.getTime() >= Date.now();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} não pode ser uma data no passado.`;
        },
      },
    });
  };
}
