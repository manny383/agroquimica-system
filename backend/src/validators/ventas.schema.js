import { z } from "zod";

export const createVentaSchema = z.object({
  body: z.object({
    observaciones: z.string().optional(),
    detalles: z.array(
      z.object({
        productoId: z.coerce.number().int().positive(),
        cantidad: z.coerce.number().int().positive(),
      }),
    ).min(1),
  }),
});
