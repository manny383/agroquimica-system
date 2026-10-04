export function addSaleItem(items, productoId, available) {
  const current = items.find((item) => item.productoId === productoId);
  const quantity = (current?.cantidad || 0) + 1;
  if (quantity > available) throw new Error("No hay existencias suficientes en el almacén seleccionado.");
  return current
    ? items.map((item) => item.productoId === productoId ? { ...item, cantidad: quantity } : item)
    : [...items, { productoId, cantidad: 1 }];
}

export function saleTotal(items, productos) {
  return items.reduce((total, item) => total + Math.round(Number(productos.find((producto) => producto.id === item.productoId)?.precioVenta || 0) * 100) * item.cantidad, 0) / 100;
}
