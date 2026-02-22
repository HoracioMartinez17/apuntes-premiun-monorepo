import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Apunte } from "./apunte.entity";
import { AiService } from "../ai/ai.service";
import { CreateApunteDto } from "./dto/create-apunte.dto";
import { UpdateApunteDto } from "./dto/update-apunte.dto";

@Injectable()
export class ApuntesService {
  private aiJobs = new Map<
    string,
    {
      id: string;
      topic: string;
      status: "running" | "completed" | "failed" | "cancelled";
      processed: number;
      total: number;
      apunteId?: string;
      error?: string;
      startedAt: string;
      updatedAt: string;
      controller: AbortController;
    }
  >();

  constructor(
    @InjectRepository(Apunte)
    private apuntesRepository: Repository<Apunte>,
    private readonly aiService: AiService,
  ) {}

  async create(apunteData: CreateApunteDto): Promise<Apunte> {
    try {
      const apunte = this.apuntesRepository.create(apunteData);
      return await this.apuntesRepository.save(apunte);
    } catch (error) {
      throw new BadRequestException(`Error al crear apunte: ${error.message}`);
    }
  }

  async findAll(): Promise<Apunte[]> {
    return this.apuntesRepository.find({ relations: ["author"] });
  }

  async findPublished(): Promise<Apunte[]> {
    return this.apuntesRepository.find({
      where: { published: true },
      relations: ["author"],
    });
  }

  async findOne(id: string): Promise<Apunte> {
    const apunte = await this.apuntesRepository.findOne({
      where: { id },
      relations: ["author"],
    });
    if (!apunte) {
      throw new NotFoundException("Apunte no encontrado");
    }
    return apunte;
  }

  async update(id: string, apunteData: UpdateApunteDto): Promise<Apunte> {
    try {
      // Verificar que el apunte existe
      const apunte = await this.findOne(id);

      // Actualizar solo los campos que fueron proporcionados
      const updatePayload: any = {};

      if (apunteData.title !== undefined) {
        if (!apunteData.title || apunteData.title.trim() === "") {
          throw new BadRequestException("El título no puede estar vacío");
        }
        updatePayload.title = apunteData.title;
      }

      if (apunteData.category !== undefined) {
        updatePayload.category = apunteData.category;
      }

      if (apunteData.content !== undefined) {
        updatePayload.content = apunteData.content;
      }

      if (apunteData.modules !== undefined) {
        updatePayload.modules = apunteData.modules;
      }

      if (apunteData.published !== undefined) {
        updatePayload.published = apunteData.published;
      }

      // Ejecutar la actualización
      const result = await this.apuntesRepository.update(id, updatePayload);

      if (result.affected === 0) {
        throw new BadRequestException("No se pudo actualizar el apunte");
      }

      // Devolver el apunte actualizado
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Error al actualizar apunte: ${error.message}`);
    }
  }

  async remove(id: string): Promise<void> {
    await this.apuntesRepository.delete(id);
  }

  async createWithAI(topic: string): Promise<Apunte> {
    const data = await this.aiService.generateApuntes(topic);
    return this.saveApunteFromAI(data);
  }

  async startAIGeneration(topic: string) {
    if (!topic || !topic.trim()) {
      throw new BadRequestException("El tema es requerido");
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const controller = new AbortController();

    this.aiJobs.set(id, {
      id,
      topic,
      status: "running",
      processed: 0,
      total: 0,
      startedAt: now,
      updatedAt: now,
      controller,
    });

    setImmediate(async () => {
      const job = this.aiJobs.get(id);
      if (!job) return;

      try {
        const data = await this.aiService.generateApuntes(topic, {
          signal: controller.signal,
          onTotal: (total) => {
            job.total = total;
            job.updatedAt = new Date().toISOString();
          },
          onProgress: ({ processed, total, lessonTitle }) => {
            job.processed = processed;
            job.total = total;
            job.updatedAt = new Date().toISOString();
            if (lessonTitle) {
              job.error = undefined;
            }
          },
        });

        if (controller.signal.aborted) {
          job.status = "cancelled";
          job.updatedAt = new Date().toISOString();
          return;
        }

        const apunte = await this.saveApunteFromAI(data);
        job.status = "completed";
        job.apunteId = apunte.id;
        job.updatedAt = new Date().toISOString();
      } catch (error: any) {
        if (controller.signal.aborted) {
          job.status = "cancelled";
        } else {
          job.status = "failed";
          job.error = error?.message || "Error desconocido";
        }
        job.updatedAt = new Date().toISOString();
      }
    });

    return { jobId: id };
  }

  async getAIGenerationStatus(jobId: string) {
    const job = this.aiJobs.get(jobId);
    if (!job) {
      throw new NotFoundException("Job no encontrado");
    }

    const { controller, ...rest } = job;
    return rest;
  }

  async cancelAIGeneration(jobId: string) {
    const job = this.aiJobs.get(jobId);
    if (!job) {
      throw new NotFoundException("Job no encontrado");
    }

    if (job.status === "completed" || job.status === "failed") {
      return { status: job.status };
    }

    job.status = "cancelled";
    job.updatedAt = new Date().toISOString();
    job.controller.abort();
    return { status: job.status };
  }

  private async saveApunteFromAI(data: any): Promise<Apunte> {
    const modulesData = data.modules.map((mod: any) => ({
      title: mod.title,
      lessons: mod.lessons.map((lesson: any) => ({
        title: lesson.title,
        brief: lesson.brief,
        content: lesson.content_md,
      })),
    }));

    return await this.apuntesRepository.save({
      title: data.title,
      category: data.category,
      modules: modulesData,
      published: true,
    });
  }
}
