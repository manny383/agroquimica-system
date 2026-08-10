import { prisma } from "../config/prisma.js";

const estadosConSalidaInventario = ["SURTIDO", "ENTREGADO"];

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

export async function listPedidos(req, res, next) {
  try {
    const where = req.user.rol === "CLIENTE" ? { clienteId: req.user.clienteId } : {};

    if (req.user.rol === "CLIENTE" && !req.user.clienteId) {
      return res.status(403).json({ message: "Usuario cliente sin cliente asociado" });
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { cliente: true, vendedor: true, detalles: { include: { producto: true } } },
    });

    return res.json(pedidos);
  } catch (error) {
    return next(error);
  }
}

export async function createPedido(req, res, next) {
  try {
    const { observaciones, detalles } = req.validated.body;
    const clienteId = req.user.rol === "CLIENTE" ? req.user.clienteId : req.validated.body.clienteId;
    const vendedorId = req.user.id;

    if (!clienteId) {
      return res.status(400).json({ message: "Debes seleccionar un cliente para el pedido" });
    }

    if (req.user.rol === "CLIENTE" && !req.user.clienteId) {
      return res.status(403).json({ message: "Usuario cliente sin cliente asociado" });
    }

    const productos = await prisma.producto.findMany({
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

    const total = detallesConPrecio.reduce((sum, detalle) => sum + detalle.subtotal, 0);
    const pedido = await prisma.pedido.create({
      data: {
        clienteId,
        vendedorId,
        observaciones,
        total,
        detalles: { create: detallesConPrecio },
      },
      include: { cliente: true, vendedor: true, detalles: { include: { producto: true } } },
    });

    return res.status(201).json(pedido);
  } catch (error) {
    return next(error);
  }
}

export async function updateEstadoPedido(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { estado } = req.validated.body;
    const pedido = await prisma.$transaction(async (tx) => {
      const actual = await tx.pedido.findUnique({
        where: { id },
        include: { detalles: true },
      });

      if (!actual) {
        const error = new Error("Pedido no encontrado");
        error.status = 404;
        throw error;
      }

      const debeDescontarInventario = estadosConSalidaInventario.includes(estado)
        && !estadosConSalidaInventario.includes(actual.estado);

      if (debeDescontarInventario) {
        const productos = await tx.producto.findMany({
          where: { id: { in: actual.detalles.map((detalle) => detalle.productoId) } },
        });

        await descontarInventario(
          tx,
          actual.detalles,
          productos,
          `PEDIDO_${actual.id}`,
          actual.observaciones,
        );
      }

      return tx.pedido.update({
        where: { id },
        data: { estado },
        include: { cliente: true, vendedor: true, detalles: { include: { producto: true } } },
      });
    });

    return res.json(pedido);
  } catch (error) {
    return next(error);
  }
}
