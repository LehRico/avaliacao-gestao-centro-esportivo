import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Rejeita valores compostos inteiramente por dígitos (ex: "12345"),
 * usado para campos de nome que não fazem sentido sendo só números.
 */
export function IsNotOnlyDigits(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotOnlyDigits',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') {
            return false;
          }

          return !/^\d+$/.test(value.trim());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} não pode conter apenas números.`;
        },
      },
    });
  };
}
