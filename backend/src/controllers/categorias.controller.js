import { prisma } from "../config/prisma.js";

export async function listCategorias(_req, res, next) {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
    });

    return res.json(categorias);
  } catch (error) {
    return next(error);
  }
}

export async function createCategoria(req, res, next) {
  try {
    const categoria = await prisma.categoria.create({
      data: req.validated.body,
    });

    return res.status(201).json(categoria);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "La categoria ya existe" });
    }

    return next(error);
  }
}
