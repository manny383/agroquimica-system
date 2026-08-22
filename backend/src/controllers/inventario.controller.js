import { prisma } from "../config/prisma.js";

export async function listInventario(_req, res, next) {
  try {
    const inventario = await prisma.inventario.findMany({
      include: { producto: true, almacen: true },
      orderBy: { producto: { nombre: "asc" } },
    });

    return res.json(inventario);
  } catch (error) {
    return next(error);
  }
}

export async function listMovimientosInventario(_req, res, next) {
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      include: { producto: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return res.json(movimientos);
  } catch (error) {
    return next(error);
  }
}

export async function ajustarInventario(req, res, next) {
  try {
    const { productoId, almacenId, cantidad, tipo, motivo, nota } = req.validated.body;

    const inventario = await prisma.$transaction(async (tx) => {
      const actual = await tx.inventario.upsert({
        where: { productoId_almacenId: { productoId, almacenId } },
        create: { productoId, almacenId, cantidad: 0 },
        update: {},
      });

      const nuevaCantidad = tipo === "SALIDA"
        ? actual.cantidad - cantidad
        : tipo === "AJUSTE"
          ? cantidad
          : actual.cantidad + cantidad;

      if (nuevaCantidad < 0) {
        const error = new Error("Inventario insuficiente");
        error.status = 409;
        throw error;
      }

      const referencia = tipo === "SALIDA" && motivo
        ? `BAJA_${motivo}`
        : "AJUSTE_MANUAL";
      const notaMovimiento = tipo === "SALIDA" && motivo
        ? [motivo.replaceAll("_", " "), nota].filter(Boolean).join(" - ")
        : nota;

      await tx.movimientoInventario.create({
        data: { productoId, tipo, cantidad, nota: notaMovimiento, referencia },
      });

      return tx.inventario.update({
        where: { id: actual.id },
        data: { cantidad: nuevaCantidad },
        include: { producto: true, almacen: true },
      });
    });

    return res.json(inventario);
  } catch (error) {
    return next(error);
  }
}
