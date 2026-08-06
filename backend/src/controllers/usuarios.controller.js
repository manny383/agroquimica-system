import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";

const userSelect = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  clienteId: true,
  cliente: true,
  createdAt: true,
  updatedAt: true,
};

export async function listUsuarios(_req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { nombre: "asc" },
      select: userSelect,
    });

    return res.json(usuarios);
  } catch (error) {
    return next(error);
  }
}

export async function getUsuario(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.validated.params.id },
      select: userSelect,
    });

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json(usuario);
  } catch (error) {
    return next(error);
  }
}

export async function createUsuario(req, res, next) {
  try {
    const { password, ...data } = req.validated.body;
    const exists = await prisma.usuario.findUnique({ where: { email: data.email } });

    if (exists) {
      return res.status(409).json({ message: "El correo ya esta registrado" });
    }

    if (data.clienteId) {
      const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });

      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
    }

    const usuario = await prisma.usuario.create({
      data: {
        ...data,
        password: await bcrypt.hash(password, 10),
      },
      select: userSelect,
    });

    return res.status(201).json(usuario);
  } catch (error) {
    return next(error);
  }
}

export async function updateUsuario(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { password, ...data } = req.validated.body;

    const current = await prisma.usuario.findUnique({ where: { id } });

    if (!current) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    if (data.clienteId) {
      const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });

      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
    }

    const nextRole = data.rol || current.rol;
    const nextClienteId = data.clienteId === undefined ? current.clienteId : data.clienteId;

    if (nextRole === "CLIENTE" && !nextClienteId) {
      return res.status(400).json({ message: "Debes asociar un cliente al usuario con rol CLIENTE" });
    }

    if (nextRole !== "CLIENTE" && nextClienteId) {
      return res.status(400).json({ message: "Solo los usuarios CLIENTE pueden tener clienteId" });
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: userSelect,
    });

    return res.json(usuario);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ message: "El correo ya esta registrado" });
    }

    return next(error);
  }
}

export async function deactivateUsuario(req, res, next) {
  try {
    const usuario = await prisma.usuario.update({
      where: { id: req.validated.params.id },
      data: { activo: false },
      select: userSelect,
    });

    return res.json(usuario);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return next(error);
  }
}
