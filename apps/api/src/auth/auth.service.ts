import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasAccess: user.hasAccess,
      },
    };
  }

  async register(email: string, password: string, name?: string) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException("El usuario ya existe");
    }
    const user = await this.usersService.create(email, password, name);
    const { password: _, ...result } = user;
    return this.login(result);
  }

  async loginWithMagicLink(token: string) {
    const user = await this.usersService.findByAccessToken(token);

    if (!user) {
      throw new UnauthorizedException("Token de acceso inválido");
    }

    // Verificar si el token ha expirado
    if (user.accessTokenExpiry && user.accessTokenExpiry < new Date()) {
      throw new UnauthorizedException("El token de acceso ha expirado");
    }

    // Verificar que el usuario tenga acceso
    if (!user.hasAccess) {
      throw new UnauthorizedException("Usuario sin acceso autorizado");
    }

    const { password, accessToken, ...result } = user;
    return this.login(result);
  }
}
