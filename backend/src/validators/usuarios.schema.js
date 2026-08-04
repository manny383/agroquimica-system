import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "VENDEDOR", "ALMACEN", "CLIENTE"]);

export const createUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    rol: roleSchema.default("VENDEDOR"),
    activo: z.boolean().optional(),
  }),
});

export const updateUsuarioSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    nombre: z.string().min(2).optional(),
    email: z.email().optional(),
    password: z.string().min(6).optional(),
    rol: roleSchema.optional(),
    activo: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo",
  }),
});

export const usuarioIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});
