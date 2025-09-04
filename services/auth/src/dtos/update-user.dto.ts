import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from './signup.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least $constraint1 characters' })
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Confirm Password must be at least $constraint1 characters' })
  @Match('password', { message: 'Confirm password must match password' })
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{7,15}$/, { message: 'Phone Number must be digits (7-15 chars)' })
  phone?: string;

  // optional profile fields
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dob must be an ISO date string (YYYY-MM-DD)' })
  dob?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'About must be at most $constraint1 characters' })
  about?: string;
}
