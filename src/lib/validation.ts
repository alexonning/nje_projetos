import { z } from "zod";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}).nullable();

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(""),
  dueDate: dateField,
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).default(""),
  projectId: z.string().uuid(),
  status: z.enum(["Pendente", "Em progresso", "Finalizado"]).default("Pendente"),
  priority: z.enum(["Urgente", "Alta", "Média", "Baixa"]).default("Média"),
  dueDate: dateField,
  assigneeIds: z.array(z.string().uuid()).max(50).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  checklist: z.array(z.object({ title: z.string().trim().min(1).max(300), completed: z.boolean().default(false) })).max(100).default([]),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(10000).optional(),
  projectId: z.string().uuid().optional(),
  status: z.enum(["Pendente", "Em progresso", "Finalizado"]).optional(),
  priority: z.enum(["Urgente", "Alta", "Média", "Baixa"]).optional(),
  dueDate: dateField.optional(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  checklist: z.array(z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(300), completed: z.boolean() })).max(100).optional(),
});

const passwordSchema = z.string().min(12).max(128);
const passwordConfirmationSchema = z.string().min(1).max(128);
const loginEmailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());

export const loginSchema = z.object({
  email: loginEmailSchema,
  password: z.string().min(1).max(128),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: loginEmailSchema,
  jobTitle: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(40).default(""),
  password: passwordSchema,
  passwordConfirmation: passwordConfirmationSchema,
}).refine((data) => data.password === data.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "As senhas não coincidem.",
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  email: z.union([loginEmailSchema, z.null()]).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
});

export const passwordResetSchema = z.object({
  password: passwordSchema,
  passwordConfirmation: passwordConfirmationSchema,
}).refine((data) => data.password === data.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "As senhas não coincidem.",
});
