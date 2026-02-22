import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User, UserRole } from "./user.entity";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { EmailService } from "../email/email.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async create(
    email: string,
    password: string,
    name?: string,
    role: UserRole = UserRole.USER,
    hasAccess: boolean = false,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
      role,
      hasAccess,
    });
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ["id", "email", "name", "role", "hasAccess", "createdAt"],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async updateAccess(id: string, hasAccess: boolean): Promise<User> {
    await this.usersRepository.update(id, { hasAccess });
    return this.findOne(id);
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    await this.usersRepository.update(id, { role });
    return this.findOne(id);
  }

  async generateAccessToken(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date; emailSent: boolean }> {
    const token = randomBytes(32).toString("hex");
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 365); // Token valido por 1 año

    await this.usersRepository.update(userId, {
      accessToken: token,
      accessTokenExpiry: expiryDate,
    });

    const user = await this.findOne(userId);
    const emailSent = await this.emailService.sendAccessTokenRenewalEmail(
      user.email,
      token,
      user.name,
    );

    return { token, expiresAt: expiryDate, emailSent };
  }

  async findByAccessToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { accessToken: token },
    });
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
