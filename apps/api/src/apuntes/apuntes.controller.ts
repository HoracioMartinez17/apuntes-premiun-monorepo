import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ApuntesService } from "./apuntes.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";
import { CreateApunteDto } from "./dto/create-apunte.dto";
import { UpdateApunteDto } from "./dto/update-apunte.dto";

@Controller("apuntes")
export class ApuntesController {
  constructor(private readonly apuntesService: ApuntesService) {}

  @Get("published")
  @UseGuards(JwtAuthGuard)
  findPublished() {
    return this.apuntesService.findPublished();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.apuntesService.findAll();
  }

  @Post("generate/start")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async startGenerate(@Body("topic") topic: string) {
    return this.apuntesService.startAIGeneration(topic);
  }

  @Get("generate/:jobId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getGenerateStatus(@Param("jobId") jobId: string) {
    return this.apuntesService.getAIGenerationStatus(jobId);
  }

  @Post("generate/:jobId/cancel")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async cancelGenerate(@Param("jobId") jobId: string) {
    return this.apuntesService.cancelAIGeneration(jobId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  findOne(@Param("id") id: string) {
    return this.apuntesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() apunteData: CreateApunteDto) {
    if (!apunteData.title) {
      throw new BadRequestException("El título es requerido");
    }
    return this.apuntesService.create(apunteData);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() apunteData: UpdateApunteDto) {
    if (!id) {
      throw new BadRequestException("El ID es requerido");
    }
    return this.apuntesService.update(id, apunteData);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.apuntesService.remove(id);
  }

  @Post("generate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async generate(@Body("topic") topic: string) {
    return this.apuntesService.createWithAI(topic);
  }
}
