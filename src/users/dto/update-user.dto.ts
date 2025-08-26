import { IsOptional, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @MinLength(6)
  confirmPassword?: string;

  @IsOptional()
  role?: string;
}
