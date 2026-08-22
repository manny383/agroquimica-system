import { z } from "zod";

export const ajustarInventarioSchema = z.object({
  body: z.object({
    productoId: z.coerce.number().int().positive(),
    almacenId: z.coerce.number().int().positive(),
    cantidad: z.coerce.number().int().positive(),
    tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]).default("ENTRADA"),
    motivo: z.enum(["VENTA", "MERMA", "VENCIDO", "DANO", "DEVOLUCION_PROVEEDOR", "CONTEO_FISICO", "OTRO"]).optional(),
    nota: z.string().optional(),
  }),
});
