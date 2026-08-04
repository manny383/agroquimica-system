import { z } from "zod";

export const createProductoSchema = z.object({
  body: z.object({
    sku: z.string().min(2),
    nombre: z.string().min(2),
    descripcion: z.string().optional(),
    unidad: z.string().min(1).default("unidad"),
    precioVenta: z.coerce.number().positive(),
    stockMinimo: z.coerce.number().int().min(0).default(0),
    categoriaId: z.coerce.number().int().positive().optional(),
    marcaId: z.coerce.number().int().positive().optional(),
  }),
});
