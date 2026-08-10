import { prisma } from "../config/prisma.js";

async function descontarInventario(tx, detalles, productos, referencia, nota) {
  for (const detalle of detalles) {
    let pendiente = detalle.cantidad;
    const inventarios = await tx.inventario.findMany({
      where: { productoId: detalle.productoId, cantidad: { gt: 0 } },
      orderBy: { id: "asc" },
    });

    const disponible = inventarios.reduce((sum, item) => sum + item.cantidad, 0);

    if (disponible < detalle.cantidad) {
      const producto = productos.find((item) => item.id === detalle.productoId);
      const error = new Error(`Inventario insuficiente para ${producto?.nombre || "producto"}`);
      error.status = 409;
      throw error;
    }

    for (const inventario of inventarios) {
      if (pendiente === 0) break;

      const salida = Math.min(inventario.cantidad, pendiente);
      pendiente -= salida;

      await tx.inventario.update({
        where: { id: inventario.id },
        data: { cantidad: inventario.cantidad - salida },
      });

      await tx.movimientoInventario.create({
        data: {
          productoId: detalle.productoId,
          tipo: "SALIDA",
          cantidad: salida,
          referencia,
          nota,
        },
      });
    }
  }
}

export async function listVentas(_req, res, next) {
  try {
    const ventas = await prisma.venta.findMany({
      orderBy: { createdAt: "desc" },
      include: { empleado: true, detalles: { include: { producto: true } } },
    });

    return res.json(ventas);
  } catch (error) {
    return next(error);
  }
}

export async function createVenta(req, res, next) {
  try {
    const { observaciones, detalles } = req.validated.body;
    const empleadoId = req.user.id;

    const venta = await prisma.$transaction(async (tx) => {
      const productos = await tx.producto.findMany({
        where: { id: { in: detalles.map((detalle) => detalle.productoId) } },
      });

      const detallesConPrecio = detalles.map((detalle) => {
        const producto = productos.find((item) => item.id === detalle.productoId);

        if (!producto) {
          const error = new Error(`Producto ${detalle.productoId} no existe`);
          error.status = 404;
          throw error;
        }

        const precioUnitario = Number(producto.precioVenta);
        return {
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
          precioUnitario,
          subtotal: precioUnitario * detalle.cantidad,
        };
      });

      await descontarInventario(tx, detallesConPrecio, productos, "VENTA_DIRECTA", observaciones);

      const total = detallesConPrecio.reduce((sum, detalle) => sum + detalle.subtotal, 0);

      return tx.venta.create({
        data: {
          empleadoId,
          observaciones,
          total,
          detalles: { create: detallesConPrecio },
        },
        include: { empleado: true, detalles: { include: { producto: true } } },
      });
    });

    return res.status(201).json(venta);
  } catch (error) {
    return next(error);
  }
}
