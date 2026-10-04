import test from "node:test";
import assert from "node:assert/strict";
import { addSaleItem, saleTotal } from "./saleCart.js";

test("lecturas repetidas aumentan la misma línea y respetan stock", () => {
  let items = addSaleItem([], 1, 2);
  items = addSaleItem(items, 1, 2);
  assert.deepEqual(items, [{ productoId: 1, cantidad: 2 }]);
  assert.throws(() => addSaleItem(items, 1, 2), /existencias suficientes/);
  assert.throws(() => addSaleItem([], 2, 0), /existencias suficientes/);
});

test("total suma cantidades y precios de diferentes productos", () => {
  assert.equal(saleTotal([{ productoId: 1, cantidad: 3 }, { productoId: 2, cantidad: 2 }], [{ id: 1, precioVenta: "0.10" }, { id: 2, precioVenta: "12.50" }]), 25.3);
});
