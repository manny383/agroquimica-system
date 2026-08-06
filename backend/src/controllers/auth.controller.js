import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

export async function register(req, res, next) {
  try {
    const { nombre, email, password, rol, clienteId } = req.validated.body;
    const exists = await prisma.usuario.findUnique({ where: { email } });

    if (exists) {
      return res.status(409).json({ message: "El correo ya esta registrado" });
    }

    if (clienteId) {
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });

      if (!cliente) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({
      data: { nombre, email, password: hashedPassword, rol, clienteId },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, clienteId: true },
    });

    return res.status(201).json(user);
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.validated.body;
    const user = await prisma.usuario.findUnique({ where: { email } });

    if (!user || !user.activo) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, clienteId: user.clienteId },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, clienteId: user.clienteId },
    });
  } catch (error) {
    return next(error);
  }
}
