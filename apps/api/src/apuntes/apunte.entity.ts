import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from "typeorm";
import { User } from "../users/user.entity";

@Entity("apuntes")
export class Apunte {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column("text", { nullable: true })
  content: string;

  @Column("jsonb", { nullable: true })
  modules: any;

  @Column({ nullable: true })
  category: string;

  @Column({ default: true })
  published: boolean;

  @ManyToOne(() => User, (user) => user.apuntes)
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
