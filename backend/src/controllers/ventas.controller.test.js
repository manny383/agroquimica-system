import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../config/prisma.js";
import { createVenta } from "./ventas.controller.js";

test("venta usa precio del servidor y descuenta solo el almacén solicitado", async () => {
  const original = prisma.$transaction;
  const movements = [];
  let created;
  let stock = 5;
  prisma.$transaction = async (callback) => callback({
    producto: { findMany: async () => [{ id: 1, nombre: "Producto", activo: true, precioVenta: "12.50" }] },
    inventario: {
      findMany: async ({ where }) => { assert.equal(where.almacenId, 7); return [{ id: 2, cantidad: stock }]; },
      updateMany: async ({ where, data }) => {
        assert.equal(where.cantidad.gte, 2);
        assert.equal(data.cantidad.decrement, 2);
        stock -= data.cantidad.decrement;
        return { count: 1 };
      },
    },
    movimientoInventario: { create: async ({ data }) => movements.push(data) },
    venta: { create: async ({ data }) => { created = data; return { id: 10, ...data }; } },
  });
  try {
    let response;
    await createVenta({ user: { id: 3 }, validated: { body: { almacenId: 7, detalles: [{ productoId: 1, cantidad: 2, precioUnitario: 0 }] } } }, {
      status: (code) => { assert.equal(code, 201); return { json: (data) => { response = data; } }; },
    }, (error) => { throw error; });
    assert.equal(stock, 3);
    assert.equal(created.total, 25);
    assert.equal(created.detalles.create[0].precioUnitario, 12.5);
    assert.equal(movements.length, 1);
    assert.equal(movements[0].referencia, "VENTA_DIRECTA");
    assert.equal(response.id, 10);
  } finally { prisma.$transaction = original; }
});

test("stock concurrente insuficiente impide crear venta o movimiento", async () => {
  const original = prisma.$transaction;
  prisma.$transaction = async (callback) => callback({
    producto: { findMany: async () => [{ id: 1, nombre: "Producto", activo: true, precioVenta: 10 }] },
    inventario: { findMany: async () => [{ id: 2, cantidad: 5 }], updateMany: async () => ({ count: 0 }) },
    movimientoInventario: { create: async () => assert.fail("No debe crear movimiento") },
    venta: { create: async () => assert.fail("No debe crear venta") },
  });
  try {
    let failure;
    await createVenta({ user: { id: 3 }, validated: { body: { almacenId: 7, detalles: [{ productoId: 1, cantidad: 2 }] } } }, { status: () => assert.fail("No debe responder éxito") }, (error) => { failure = error; });
    assert.equal(failure.status, 409);
  } finally { prisma.$transaction = original; }
});
