import { IsString, IsOptional, IsBoolean, IsArray } from "class-validator";

export class UpdateApunteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  modules?: any[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
