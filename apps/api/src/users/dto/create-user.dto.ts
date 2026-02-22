import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { UserRole } from "../user.entity";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn([UserRole.USER, UserRole.ADMIN])
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  hasAccess?: boolean;
}
