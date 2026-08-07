import { z } from "zod";

export const createCatalogoSchema = z.object({
  body: z.object({
    nombre: z.string().min(2),
  }),
});
