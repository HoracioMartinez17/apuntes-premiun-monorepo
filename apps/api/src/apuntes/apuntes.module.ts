import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Apunte } from "./apunte.entity";
import { ApuntesService } from "./apuntes.service";
import { ApuntesController } from "./apuntes.controller";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [TypeOrmModule.forFeature([Apunte]), AiModule],
  providers: [ApuntesService],
  controllers: [ApuntesController],
})
export class ApuntesModule {}
