import { z } from "zod";

export const createPedidoSchema = z.object({
  body: z.object({
    clienteId: z.coerce.number().int().positive().optional(),
    observaciones: z.string().optional(),
    detalles: z.array(
      z.object({
        productoId: z.coerce.number().int().positive(),
        cantidad: z.coerce.number().int().positive(),
      }),
    ).min(1),
  }),
});

export const updateEstadoPedidoSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    estado: z.enum(["BORRADOR", "PENDIENTE", "APROBADO", "SURTIDO", "ENTREGADO", "CANCELADO"]),
  }),
});
