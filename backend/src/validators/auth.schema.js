import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    nombre: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    rol: z.enum(["ADMIN", "VENDEDOR", "ALMACEN"]).default("VENDEDOR"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email(),
    password: z.string().min(1),
  }),
});
