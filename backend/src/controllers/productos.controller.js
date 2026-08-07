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
    const { inventarioInicial, ...data } = req.validated.body;

    const producto = await prisma.$transaction(async (tx) => {
      const created = await tx.producto.create({ data });

      if (inventarioInicial && inventarioInicial.cantidad > 0) {
        await tx.inventario.create({
          data: {
            productoId: created.id,
            almacenId: inventarioInicial.almacenId,
            cantidad: inventarioInicial.cantidad,
          },
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: created.id,
            tipo: "ENTRADA",
            cantidad: inventarioInicial.cantidad,
            nota: inventarioInicial.nota,
            referencia: "PRODUCTO_NUEVO",
          },
        });
      }

      return tx.producto.findUnique({
        where: { id: created.id },
        include: { categoria: true, marca: true, inventario: { include: { almacen: true } } },
      });
    });

    return res.status(201).json(producto);
  } catch (error) {
    return next(error);
  }
}
