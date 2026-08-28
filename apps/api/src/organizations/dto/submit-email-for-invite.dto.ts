import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Custom validator to ensure email and confirmEmail match
function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return value === relatedValue;
        },
        defaultMessage(_args: ValidationArguments) {
          return 'Email addresses do not match';
        },
      },
    });
  };
}

export class SubmitEmailForInviteDto {
  @IsString({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must be at least 1 character' })
  @MaxLength(255, { message: 'Name must be less than 255 characters' })
  name: string;

  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must be less than 255 characters' })
  email: string;

  @IsString({ message: 'Confirm email is required' })
  @IsEmail({}, { message: 'Confirm email must be a valid email address' })
  @MaxLength(255, { message: 'Confirm email must be less than 255 characters' })
  @Match('email', { message: 'Email addresses do not match' })
  confirmEmail: string;
}
