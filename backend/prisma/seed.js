import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  await prisma.usuario.upsert({
    where: { email: "admin@agroquimica.local" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@agroquimica.local",
      password,
      rol: "ADMIN",
    },
  });

  const almacen = await prisma.almacen.upsert({
    where: { nombre: "Almacen principal" },
    update: {},
    create: { nombre: "Almacen principal" },
  });

  const categoria = await prisma.categoria.upsert({
    where: { nombre: "Fertilizantes" },
    update: {},
    create: { nombre: "Fertilizantes" },
  });

  const producto = await prisma.producto.upsert({
    where: { sku: "FERT-001" },
    update: {},
    create: {
      sku: "FERT-001",
      nombre: "Fertilizante 20-20-20",
      unidad: "saco",
      precioVenta: 285,
      stockMinimo: 10,
      categoriaId: categoria.id,
    },
  });

  await prisma.inventario.upsert({
    where: { productoId_almacenId: { productoId: producto.id, almacenId: almacen.id } },
    update: {},
    create: { productoId: producto.id, almacenId: almacen.id, cantidad: 50 },
  });

  await prisma.cliente.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: "Cliente de prueba",
      empresa: "Rancho Demo",
      telefono: "0000-0000",
      limiteCredito: 5000,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
