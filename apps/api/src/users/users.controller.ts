import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "./user.entity";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() body: CreateUserDto) {
    const user = await this.usersService.create(
      body.email,
      body.password,
      body.name,
      body.role,
      body.hasAccess,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasAccess: user.hasAccess,
      createdAt: user.createdAt,
    };
  }

  @Patch(":id/access")
  @Roles(UserRole.ADMIN)
  updateAccess(@Param("id") id: string, @Body("hasAccess") hasAccess: boolean) {
    return this.usersService.updateAccess(id, hasAccess);
  }

  @Patch(":id/role")
  @Roles(UserRole.ADMIN)
  updateRole(@Param("id") id: string, @Body("role") role: UserRole) {
    return this.usersService.updateRole(id, role);
  }

  @Post(":id/access-token")
  @Roles(UserRole.ADMIN)
  generateAccessToken(@Param("id") id: string) {
    return this.usersService.generateAccessToken(id);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
