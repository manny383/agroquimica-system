import { prisma } from "../config/prisma.js";

export async function listAlmacenes(_req, res, next) {
  try {
    const almacenes = await prisma.almacen.findMany({
      orderBy: { nombre: "asc" },
    });

    return res.json(almacenes);
  } catch (error) {
    return next(error);
  }
}
