import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

/**
 * Simple property-match decorator to validate confirmPassword === password
 */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    const target = (object as { constructor: { new (...args: unknown[]): unknown } }).constructor;
    registerDecorator({
      name: 'match',
      target,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          const obj = args.object as Record<string, unknown>;
          return value === obj[relatedPropertyName];
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property} must match ${relatedPropertyName}`;
        },
      },
    });
  };
}

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least $constraint1 characters' })
  password!: string;

  @IsString()
  @MinLength(6, { message: 'Confirm Password must be at least $constraint1 characters' })
  @Match('password', { message: 'Confirm password must match password' })
  confirmPassword!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{7,15}$/, { message: 'Phone Number must be digits (7-15 chars)' })
  phone?: string;
}
