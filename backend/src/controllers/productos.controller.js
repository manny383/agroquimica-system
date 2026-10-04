import { prisma } from "../config/prisma.js";

export async function listProductos(req, res, next) {
  try {
    const where = req.user.rol === "CLIENTE"
      ? { activo: true, inventario: { some: { cantidad: { gt: 0 } } } }
      : {};
    const productos = await prisma.producto.findMany({
      where,
      orderBy: { nombre: "asc" },
      include: { categoria: true, marca: true, inventario: { include: { almacen: true } } },
    });

    return res.json(productos);
  } catch (error) {
    return next(error);
  }
}

export async function updateCodigoBarras(req, res, next) {
  try {
    const producto = await prisma.producto.update({
      where: { id: req.validated.params.id },
      data: { codigoBarras: req.validated.body.codigoBarras },
    });
    return res.json(producto);
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "Ese código de barras ya pertenece a otro producto." });
    if (error.code === "P2025") return res.status(404).json({ message: "Producto no encontrado." });
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
    if (error.code === "P2002") return res.status(409).json({ message: "El SKU o código de barras ya está registrado." });
    return next(error);
  }
}
