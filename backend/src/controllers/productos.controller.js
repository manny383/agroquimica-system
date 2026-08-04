import { prisma } from "../config/prisma.js";

export async function listProductos(_req, res, next) {
  try {
    const productos = await prisma.producto.findMany({
      orderBy: { nombre: "asc" },
      include: { categoria: true, marca: true, inventario: { include: { almacen: true } } },
    });

    return res.json(productos);
  } catch (error) {
    return next(error);
  }
}

export async function createProducto(req, res, next) {
  try {
    const producto = await prisma.producto.create({ data: req.validated.body });
    return res.status(201).json(producto);
  } catch (error) {
    return next(error);
  }
}
