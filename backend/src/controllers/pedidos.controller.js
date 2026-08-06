import { prisma } from "../config/prisma.js";

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
    const { clienteId, observaciones, detalles } = req.validated.body;
    const vendedorId = req.user.id;

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
    const pedido = await prisma.pedido.update({
      where: { id },
      data: { estado },
      include: { cliente: true, detalles: { include: { producto: true } } },
    });

    return res.json(pedido);
  } catch (error) {
    return next(error);
  }
}
