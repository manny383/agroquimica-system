import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "VENDEDOR", "ALMACEN", "CLIENTE"]);

export const createUsuarioSchema = z.object({
  body: z.object({
    nombre: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    rol: roleSchema.default("VENDEDOR"),
    activo: z.boolean().optional(),
    clienteId: z.coerce.number().int().positive().optional(),
  }),
}).superRefine((data, ctx) => {
  if (data.body.rol === "CLIENTE" && !data.body.clienteId) {
    ctx.addIssue({
      code: "custom",
      path: ["body", "clienteId"],
      message: "Debes asociar un cliente al usuario con rol CLIENTE",
    });
  }

  if (data.body.rol !== "CLIENTE" && data.body.clienteId) {
    ctx.addIssue({
      code: "custom",
      path: ["body", "clienteId"],
      message: "Solo los usuarios CLIENTE pueden tener clienteId",
    });
  }
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
    clienteId: z.coerce.number().int().positive().nullable().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "Debes enviar al menos un campo",
  }),
}).superRefine((data, ctx) => {
  const hasClienteId = data.body.clienteId !== undefined && data.body.clienteId !== null;

  if (data.body.rol && data.body.rol !== "CLIENTE" && hasClienteId) {
    ctx.addIssue({
      code: "custom",
      path: ["body", "clienteId"],
      message: "Solo los usuarios CLIENTE pueden tener clienteId",
    });
  }
});

export const usuarioIdSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});
