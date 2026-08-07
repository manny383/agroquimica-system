import { prisma } from "../config/prisma.js";

export async function listMarcas(_req, res, next) {
  try {
    const marcas = await prisma.marca.findMany({
      orderBy: { nombre: "asc" },
    });

    return res.json(marcas);
  } catch (error) {
    return next(error);
  }
}

export async function createMarca(req, res, next) {
  try {
    const marca = await prisma.marca.create({
      data: req.validated.body,
    });

    return res.status(201).json(marca);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "La marca ya existe" });
    }

    return next(error);
  }
}
