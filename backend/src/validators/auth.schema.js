import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    nombre: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    rol: z.enum(["ADMIN", "VENDEDOR", "ALMACEN", "CLIENTE"]).default("VENDEDOR"),
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

export const loginSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(1),
  }),
});
