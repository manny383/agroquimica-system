import { z } from "zod";

export const createClienteSchema = z.object({
  body: z.object({
    nombre: z.string().min(2),
    empresa: z.string().optional(),
    telefono: z.string().optional(),
    direccion: z.string().optional(),
    rfc: z.string().optional(),
    limiteCredito: z.coerce.number().min(0).default(0),
    usuario: z.object({
      nombre: z.string().min(2),
      email: z.email(),
      password: z.string().min(6),
      activo: z.boolean().optional(),
    }).optional(),
  }),
});
