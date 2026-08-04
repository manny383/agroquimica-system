import { z } from "zod";

export const ajustarInventarioSchema = z.object({
  body: z.object({
    productoId: z.coerce.number().int().positive(),
    almacenId: z.coerce.number().int().positive(),
    cantidad: z.coerce.number().int().positive(),
    tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]).default("ENTRADA"),
    nota: z.string().optional(),
  }),
});
