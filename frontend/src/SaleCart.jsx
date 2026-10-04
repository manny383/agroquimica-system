import React, { useState } from "react";
import { BarcodeCameraButton } from "./BarcodeCamera.jsx";
import { addSaleItem, saleTotal } from "./saleCart.js";

export default function SaleCart({ productos, almacenes, inventario, saving, onSubmit }) {
  const [items, setItems] = useState([]);
  const [almacenId, setAlmacenId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [manualId, setManualId] = useState("");
  const [message, setMessage] = useState("");
  const stock = (id) => inventario.find((item) => item.productoId === id && item.almacenId === Number(almacenId))?.cantidad ?? 0;
  const invalid = items.some((item) => !Number.isInteger(item.cantidad) || item.cantidad <= 0 || item.cantidad > stock(item.productoId) || !productos.some((producto) => producto.id === item.productoId && producto.activo));
  function add(producto) {
    if (saving) return;
    if (!almacenId) { setMessage("Selecciona el almacén antes de agregar productos."); return; }
    if (!producto?.activo) { setMessage("Producto no registrado o inactivo. Vincula su código en Inventario."); return; }
    try {
      setItems(addSaleItem(items, producto.id, stock(producto.id)));
      setMessage(`${producto.nombre} agregado. Revisa las cantidades antes de confirmar.`);
      setCodigo("");
    } catch (error) { setMessage(error.message); }
  }
  function scan(code = codigo) { add(productos.find((producto) => producto.codigoBarras === code.trim())); }
  return <form className="compact-form" onSubmit={(event) => {
    if (saving || !items.length || invalid) { event.preventDefault(); return; }
    onSubmit(event);
  }} onReset={() => { setItems([]); setCodigo(""); setManualId(""); setMessage(""); }}>
    <fieldset disabled={saving} className="sale-cart-fields compact-form">
      <label>Almacén de venta
        <select required name="almacenId" value={almacenId} onChange={(event) => { setAlmacenId(event.target.value); setMessage(""); }}>
          <option value="">Selecciona un almacén</option>
          {almacenes.map((almacen) => <option key={almacen.id} value={almacen.id}>{almacen.nombre}</option>)}
        </select>
      </label>
      <label>Escanear producto
        <input value={codigo} onChange={(event) => setCodigo(event.target.value)} maxLength="100" placeholder="Escanea o escribe el código de barras" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scan(); } }} />
      </label>
      <button type="button" disabled={!almacenId || !codigo.trim()} onClick={() => scan()}>Agregar por código</button>
      <BarcodeCameraButton disabled={!almacenId || saving} onDetected={(code) => scan(code)} />
      <label>Agregar producto manualmente
        <select value={manualId} onChange={(event) => setManualId(event.target.value)}>
          <option value="">Selecciona un producto</option>
          {productos.filter((producto) => producto.activo).map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} — {producto.sku}</option>)}
        </select>
      </label>
      <button type="button" disabled={!manualId || !almacenId} onClick={() => add(productos.find((producto) => producto.id === Number(manualId)))}>Agregar producto</button>
      {message && <p role="status">{message}</p>}
      {!items.length && <p>La venta está vacía. Cada lectura agrega una unidad; el stock se descuenta al confirmar.</p>}
      {items.map((item) => {
        const producto = productos.find((producto) => producto.id === item.productoId);
        return <div className="sale-cart-item" key={item.productoId}>
          <strong>{producto?.nombre || "Producto no disponible"}</strong>
          <span>{producto?.sku} · Q {Number(producto?.precioVenta || 0).toFixed(2)} · Disponible: {stock(item.productoId)}</span>
          <input type="hidden" name="productoId" value={item.productoId} />
          <label>Cantidad de {producto?.nombre}
            <input name="cantidad" type="number" min="1" max={stock(item.productoId)} step="1" required value={item.cantidad} onChange={(event) => { const value = event.target.value; setItems(items.map((row) => row.productoId === item.productoId ? { ...row, cantidad: value === "" ? "" : Number(value) } : row)); }} />
          </label>
          <span>Subtotal: Q {(Number(producto?.precioVenta || 0) * Number(item.cantidad)).toFixed(2)}</span>
          <button type="button" onClick={() => setItems(items.filter((row) => row.productoId !== item.productoId))}>Eliminar {producto?.nombre}</button>
        </div>;
      })}
      {invalid && <p role="alert">Revisa las cantidades y el stock del almacén seleccionado. No se puede confirmar esta venta.</p>}
      <strong aria-live="polite">Total estimado: Q {saleTotal(items, productos).toFixed(2)}</strong>
      <label>Observaciones<input name="observaciones" placeholder="Nota de venta o referencia" /></label>
      <p>Confirmar registra la venta y descuenta existencias. No registres una baja manual adicional.</p>
      <button type="submit" disabled={!almacenId || !items.length || invalid}>{saving ? "Registrando…" : "Confirmar venta"}</button>
    </fieldset>
  </form>;
}
