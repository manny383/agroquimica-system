import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

export async function listClientes(req, res, next) {
  try {
    const where = req.user.rol === "CLIENTE" ? { id: req.user.clienteId } : {};
    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      include: {
        usuarios: {
          select: { id: true, nombre: true, email: true, rol: true, activo: true },
          orderBy: { nombre: "asc" },
        },
      },
    });
    return res.json(clientes);
  } catch (error) {
    return next(error);
  }
}

export async function createCliente(req, res, next) {
  try {
    const { usuario, ...clienteData } = req.validated.body;

    if (usuario) {
      const exists = await prisma.usuario.findUnique({ where: { email: usuario.email } });

      if (exists) {
        return res.status(409).json({ message: "El correo ya esta registrado" });
      }
    }

    const cliente = await prisma.$transaction(async (tx) => {
      const createdCliente = await tx.cliente.create({ data: clienteData });

      if (!usuario) {
        return createdCliente;
      }

      await tx.usuario.create({
        data: {
          nombre: usuario.nombre,
          email: usuario.email,
          password: await bcrypt.hash(usuario.password, 10),
          rol: "CLIENTE",
          activo: usuario.activo ?? true,
          clienteId: createdCliente.id,
        },
      });

      return tx.cliente.findUnique({
        where: { id: createdCliente.id },
        include: {
          usuarios: {
            select: { id: true, nombre: true, email: true, rol: true, activo: true },
            orderBy: { nombre: "asc" },
          },
        },
      });
    });

    return res.status(201).json(cliente);
  } catch (error) {
    return next(error);
  }
}
