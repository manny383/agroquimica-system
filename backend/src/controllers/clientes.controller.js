import { prisma } from "../config/prisma.js";

export async function listClientes(_req, res, next) {
  try {
    const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" } });
    return res.json(clientes);
  } catch (error) {
    return next(error);
  }
}

export async function createCliente(req, res, next) {
  try {
    const cliente = await prisma.cliente.create({ data: req.validated.body });
    return res.status(201).json(cliente);
  } catch (error) {
    return next(error);
  }
}
