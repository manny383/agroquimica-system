import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, Bell, Boxes, ClipboardList, History, Leaf, LogIn, ReceiptText, UserPlus, Users } from "lucide-react";
import "./styles.css";
import { BarcodeCameraButton, BarcodeInput } from "./BarcodeCamera.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const savedUser = localStorage.getItem("user");

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(savedUser ? JSON.parse(savedUser) : null);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [movimientosInventario, setMovimientosInventario] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [view, setView] = useState("dashboard");
  const [status, setStatus] = useState("");
  const [inventorySaving, setInventorySaving] = useState(false);
  const pedidosPendientes = useMemo(
    () => pedidos.filter((pedido) => pedido.estado === "PENDIENTE"),
    [pedidos],
  );
  const productosStockBajo = useMemo(
    () => productos
      .map((producto) => ({
        ...producto,
        disponible: getAvailableStock(producto),
      }))
      .filter((producto) => producto.stockMinimo > 0 && producto.disponible <= producto.stockMinimo)
      .sort((a, b) => (a.disponible - a.stockMinimo) - (b.disponible - b.stockMinimo)),
    [productos],
  );
  const isCliente = user?.rol === "CLIENTE";
  const canUpdatePedidoEstado = ["ADMIN", "ALMACEN"].includes(user?.rol);

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
    const data = await response.json();
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken("");
      setUser(null);
      throw new Error("Sesion vencida. Inicia sesion otra vez.");
    }

    if (!response.ok) throw new Error(data.message || "Error de API");
    return data;
  }

  async function loadData() {
    if (!token) return;
    try {
      const [productosData, clientesData, almacenesData, categoriasData, marcasData, inventarioData, movimientosData, pedidosData, usuariosData, ventasData] = await Promise.all([
        api("/productos"),
        isCliente ? Promise.resolve([]) : api("/clientes"),
        isCliente ? Promise.resolve([]) : api("/almacenes"),
        isCliente ? Promise.resolve([]) : api("/categorias"),
        isCliente ? Promise.resolve([]) : api("/marcas"),
        isCliente ? Promise.resolve([]) : api("/inventario"),
        isCliente ? Promise.resolve([]) : api("/inventario/movimientos"),
        api("/pedidos"),
        user?.rol === "ADMIN" ? api("/usuarios") : Promise.resolve([]),
        isCliente ? Promise.resolve([]) : api("/ventas"),
      ]);
      setProductos(productosData);
      setClientes(clientesData);
      setAlmacenes(almacenesData);
      setCategorias(categoriasData);
      setMarcas(marcasData);
      setInventario(inventarioData);
      setMovimientosInventario(movimientosData);
      setPedidos(pedidosData);
      setUsuarios(usuariosData);
      setVentas(ventasData);
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    loadData();
  }, [token, user?.rol]);

  useEffect(() => {
    if (isCliente && !["productos", "pedidos"].includes(view)) {
      setView("productos");
    }
  }, [isCliente, view]);

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "No se pudo iniciar sesion");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setStatus("Sesion iniciada");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const rol = form.get("rol");
    const payload = {
      nombre: form.get("nombre"),
      email: form.get("email"),
      password: form.get("password"),
      rol,
    };
    const clienteId = form.get("clienteId");

    if (rol === "CLIENTE" && clienteId) {
      payload.clienteId = clienteId;
    }

    try {
      await api("/usuarios", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      formElement.reset();
      setStatus("Usuario creado");
      loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleCreateCliente(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const usuarioNombre = form.get("usuarioNombre")?.trim();
    const usuarioEmail = form.get("usuarioEmail")?.trim();
    const usuarioPassword = form.get("usuarioPassword");
    const payload = {
      nombre: form.get("nombre"),
      empresa: form.get("empresa"),
      telefono: form.get("telefono"),
      direccion: form.get("direccion"),
      rfc: form.get("rfc"),
      limiteCredito: form.get("limiteCredito"),
    };

    if (usuarioNombre || usuarioEmail || usuarioPassword) {
      payload.usuario = {
        nombre: usuarioNombre,
        email: usuarioEmail,
        password: usuarioPassword,
      };
    }

    try {
      await api("/clientes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      formElement.reset();
      setStatus(payload.usuario ? "Cliente y usuario creados" : "Cliente creado");
      loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleAdjustInventory(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    if (inventorySaving) return;
    setInventorySaving(true);
    try {
      const resultado = await api("/inventario/ajustes", {
        method: "POST",
        body: JSON.stringify({
          productoId: form.get("productoId"),
          almacenId: form.get("almacenId"),
          tipo: form.get("tipo"),
          cantidad: form.get("cantidad"),
          motivo: form.get("motivo") || undefined,
          nota: form.get("nota"),
        }),
      });
      formElement.reset();
      setStatus(`${resultado.producto.nombre}: inventario actualizado. Stock en ${resultado.almacen.nombre}: ${resultado.cantidad}.`);
      loadData();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setInventorySaving(false);
    }
  }

  async function handleCreateProductWithInventory(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const almacenId = form.get("almacenId");
    const cantidadInicial = form.get("cantidadInicial");
    const categoriaId = form.get("categoriaId");
    const categoriaNueva = form.get("categoriaNueva")?.trim();
    const marcaId = form.get("marcaId");
    const marcaNueva = form.get("marcaNueva")?.trim();
    const payload = {
      sku: form.get("sku"),
      codigoBarras: form.get("codigoBarras")?.trim() || undefined,
      nombre: form.get("nombre"),
      descripcion: form.get("descripcion"),
      unidad: form.get("unidad"),
      precioVenta: form.get("precioVenta"),
      stockMinimo: form.get("stockMinimo"),
    };

    if (inventorySaving) return;
    if (productos.some((producto) => producto.sku.toLowerCase() === String(payload.sku).trim().toLowerCase())) {
      setStatus("Ese SKU ya está registrado. Usa Agregar existencias para ingresar más unidades.");
      return;
    }
    payload.sku = String(payload.sku).trim();
    payload.nombre = String(payload.nombre).trim();
    if (payload.codigoBarras && productos.some((producto) => producto.codigoBarras === payload.codigoBarras)) {
      setStatus("Ese código de barras ya está registrado. Usa Agregar existencias.");
      return;
    }
    if (!payload.sku || !payload.nombre) {
      setStatus("Completa el SKU y el nombre del producto.");
      return;
    }

    if (almacenId && cantidadInicial !== "") {
      payload.inventarioInicial = {
        almacenId,
        cantidad: cantidadInicial,
        nota: form.get("nota"),
      };
    }

    setInventorySaving(true);
    try {
      if (categoriaNueva) {
        const categoria = await api("/categorias", {
          method: "POST",
          body: JSON.stringify({ nombre: categoriaNueva }),
        });
        payload.categoriaId = categoria.id;
      } else if (categoriaId) {
        payload.categoriaId = categoriaId;
      }

      if (marcaNueva) {
        const marca = await api("/marcas", {
          method: "POST",
          body: JSON.stringify({ nombre: marcaNueva }),
        });
        payload.marcaId = marca.id;
      } else if (marcaId) {
        payload.marcaId = marcaId;
      }

      const producto = await api("/productos", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (payload.inventarioInicial && !producto.inventario?.length) {
        await api("/inventario/ajustes", {
          method: "POST",
          body: JSON.stringify({
            productoId: producto.id,
            almacenId: payload.inventarioInicial.almacenId,
            tipo: "ENTRADA",
            cantidad: payload.inventarioInicial.cantidad,
            nota: payload.inventarioInicial.nota || "Inventario inicial",
          }),
        });
      }

      formElement.reset();
      const stock = producto.inventario?.find((item) => item.almacenId === Number(almacenId));
      const almacen = almacenes.find((item) => item.id === Number(almacenId));
      setStatus(`${producto.nombre}: producto creado. Stock en ${almacen?.nombre || "el almacén"}: ${stock?.cantidad ?? cantidadInicial}.`);
      loadData();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setInventorySaving(false);
    }
  }

  async function handleToggleUser(usuario) {
    try {
      if (usuario.activo) {
        await api(`/usuarios/${usuario.id}`, { method: "DELETE" });
      } else {
        await api(`/usuarios/${usuario.id}`, {
          method: "PUT",
          body: JSON.stringify({ activo: true }),
        });
      }
      setStatus(usuario.activo ? "Usuario desactivado" : "Usuario activado");
      loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleCreatePedido(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const detalles = getFormDetalles(form);

    const payload = {
      observaciones: form.get("observaciones"),
      detalles,
    };
    const clienteId = form.get("clienteId");

    if (clienteId) {
      payload.clienteId = clienteId;
    }

    try {
      await api("/pedidos", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      formElement.reset();
      setStatus("Pedido creado");
      loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleCreateVenta(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await api("/ventas", {
        method: "POST",
        body: JSON.stringify({
          observaciones: form.get("observaciones"),
          detalles: getFormDetalles(form),
        }),
      });
      formElement.reset();
      setStatus("Venta registrada e inventario actualizado");
      loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleUpdatePedidoEstado(pedidoId, estado) {
    try {
      await api(`/pedidos/${pedidoId}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
      setStatus("Estado de pedido actualizado");
      loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  if (!token) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <Leaf size={42} />
          <h1>Agroquimica</h1>
          <form onSubmit={handleLogin}>
            <input name="email" type="email" defaultValue="admin@agroquimica.local" placeholder="Correo" />
            <input name="password" type="password" defaultValue="admin123" placeholder="Contrasena" />
            <button type="submit"><LogIn size={18} /> Entrar</button>
          </form>
          {status && <p className="status">{status}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside>
        <div className="brand"><Leaf /> Agroquimica</div>
        <div className="session-card">
          <p>Sesion iniciada</p>
          <strong>{user?.nombre || "Usuario"}</strong>
          <span>{user?.email}</span>
          <small>{user?.rol}</small>
        </div>
        <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); setToken(""); setUser(null); }}>Cerrar sesion</button>
        <nav className="side-nav">
          {!isCliente && (
            <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
              <Boxes size={18} /> Panel principal
            </button>
          )}
          {!isCliente && (
            <button className={view === "inventario" ? "active" : ""} onClick={() => setView("inventario")}>
              <Boxes size={18} /> Inventario
            </button>
          )}
          {isCliente && (
            <button className={view === "productos" ? "active" : ""} onClick={() => setView("productos")}>
              <Boxes size={18} /> Productos disponibles
            </button>
          )}
          {user?.rol === "ADMIN" && (
            <button className={view === "usuarios" ? "active" : ""} onClick={() => setView("usuarios")}>
              <Users size={18} /> Usuarios
            </button>
          )}
          {!isCliente && (
            <button className={view === "clientes" ? "active" : ""} onClick={() => setView("clientes")}>
              <UserPlus size={18} /> Clientes
            </button>
          )}
          <button className={view === "pedidos" ? "active" : ""} onClick={() => setView("pedidos")}>
            <ClipboardList size={18} /> {isCliente ? "Mis pedidos" : "Pedidos"}
          </button>
          {!isCliente && (
            <button className={view === "ventas" ? "active" : ""} onClick={() => setView("ventas")}>
              <ReceiptText size={18} /> Ventas
            </button>
          )}
        </nav>
      </aside>
      <section className="content">
        <header>
          <div>
            <p>{user?.nombre || "Panel administrativo"}</p>
            <h1>{viewTitles[view]}</h1>
          </div>
          {status && <span>{status}</span>}
        </header>
        <div className="metrics">
          <Metric icon={<Boxes />} label={isCliente ? "Disponibles" : "Productos"} value={productos.length} onClick={() => setView("productos")} />
          {!isCliente && <Metric icon={<Users />} label="Clientes" value={clientes.length} onClick={() => setView("clientes")} />}
          <Metric icon={<ClipboardList />} label={isCliente ? "Mi historial" : "Pedidos"} value={pedidos.length} onClick={() => setView("pedidos")} />
          {!isCliente && <Metric icon={<Bell />} label="Pendientes" value={pedidosPendientes.length} onClick={() => setView("pedidos")} />}
          {!isCliente && <Metric icon={<AlertTriangle />} label="Stock bajo" value={productosStockBajo.length} onClick={() => setView("inventario")} />}
          {!isCliente && <Metric icon={<ReceiptText />} label="Ventas" value={ventas.length} onClick={() => setView("ventas")} />}
        </div>
        {!isCliente && pedidosPendientes.length > 0 && (
          <button className="notification-banner" type="button" onClick={() => setView("pedidos")}>
            <Bell size={18} /> Hay {pedidosPendientes.length} pedido(s) pendiente(s) por confirmar
          </button>
        )}
        {!isCliente && productosStockBajo.length > 0 && (
          <button className="notification-banner danger" type="button" onClick={() => setView("inventario")}>
            <AlertTriangle size={18} /> Hay {productosStockBajo.length} producto(s) en stock bajo
          </button>
        )}
        {!isCliente && view === "dashboard" && (
          <>
            <section className="dashboard-grid">
              <LowStockPanel productos={productosStockBajo} />
              <InventoryPanel inventario={inventario} />
              <RecentOrdersPanel pedidos={pedidos} />
              <InventoryMovementsPanel movimientos={movimientosInventario} />
            </section>
          </>
        )}
        {!isCliente && view === "inventario" && (
          <section className="management-grid">
            <div className="panel">
              <h2><Boxes size={18} /> Nuevo producto</h2>
              <p>Registra el producto y sus primeras existencias en un almacén.</p>
              <form className="compact-form" onSubmit={handleCreateProductWithInventory}>
                <label>
                  SKU
                  <input name="sku" placeholder="SKU" required />
                </label>
                <label>
                  Nombre del producto
                  <input name="nombre" placeholder="Nombre del producto" required />
                </label>
                <BarcodeInput />
                <label>
                  Descripcion
                  <input name="descripcion" placeholder="Descripcion" />
                </label>
                <label>
                  Unidad
                  <input name="unidad" placeholder="Unidad" defaultValue="unidad" required />
                </label>
                <label>
                  Categoria
                  <select name="categoriaId" defaultValue="">
                    <option value="">Sin categoria</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nueva categoria
                  <input name="categoriaNueva" placeholder="Ej. Fertilizantes" />
                </label>
                <label>
                  Marca
                  <select name="marcaId" defaultValue="">
                    <option value="">Sin marca</option>
                    {marcas.map((marca) => (
                      <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Nueva marca
                  <input name="marcaNueva" placeholder="Ej. Bayer" />
                </label>
                <label>
                  Precio de venta
                  <input name="precioVenta" type="number" min="0.01" step="0.01" placeholder="Precio de venta" required />
                </label>
                <label>
                  Stock minimo
                  <input name="stockMinimo" type="number" min="0" step="1" placeholder="Stock minimo" defaultValue="0" />
                </label>
                <label>
                  Almacen inicial
                  <select name="almacenId" defaultValue="" required>
                    <option value="">Selecciona un almacen</option>
                    {almacenes.map((almacen) => (
                      <option key={almacen.id} value={almacen.id}>{almacen.nombre}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Cantidad inicial
                  <input name="cantidadInicial" type="number" min="1" step="1" placeholder="Cantidad inicial" required />
                </label>
                <label>
                  Nota de inventario
                  <input name="nota" placeholder="Nota de inventario" />
                </label>
                <button type="submit" disabled={inventorySaving || !almacenes.length}>{inventorySaving ? "Guardando…" : "Crear producto y agregar stock"}</button>
                {!almacenes.length && <p role="status">Necesitas un almacén registrado para ingresar existencias.</p>}
              </form>
            </div>
            <div className="panel">
              <InventoryEntryForm productos={productos} almacenes={almacenes} inventario={inventario} onSubmit={handleAdjustInventory} saving={inventorySaving} />
              {user?.rol === "ADMIN" && <BarcodeAssignmentForm productos={productos} api={api} onSaved={loadData} />}
              <details className="inventory-adjustments">
              <summary>Otras operaciones: salidas y ajustes</summary>
              <h2><Boxes size={18} /> Ajuste de inventario</h2>
              <form className="compact-form" onSubmit={handleAdjustInventory}>
                <select name="productoId" defaultValue="" required>
                  <option value="">Producto</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                  ))}
                </select>
                <select name="almacenId" defaultValue="" required>
                  <option value="">Almacen</option>
                  {almacenes.map((almacen) => (
                    <option key={almacen.id} value={almacen.id}>{almacen.nombre}</option>
                  ))}
                </select>
                <select name="tipo" defaultValue="ENTRADA" required>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SALIDA">Salida</option>
                  <option value="AJUSTE">Ajuste exacto</option>
                </select>
                <select name="motivo" defaultValue="">
                  <option value="">Motivo de baja</option>
                  <option value="MERMA">Merma</option>
                  <option value="VENCIDO">Producto vencido</option>
                  <option value="DANO">Producto danado</option>
                  <option value="DEVOLUCION_PROVEEDOR">Devolucion a proveedor</option>
                  <option value="CONTEO_FISICO">Conteo fisico</option>
                  <option value="OTRO">Otro</option>
                </select>
                <input name="cantidad" type="number" min="1" step="1" placeholder="Cantidad" required />
                <input name="nota" placeholder="Nota" />
                <button type="submit" disabled={inventorySaving}>{inventorySaving ? "Guardando…" : "Guardar ajuste"}</button>
              </form>
              </details>
            </div>
            <div className="wide-panel">
              <InventoryPanel inventario={inventario} />
            </div>
            <div className="wide-panel">
              <LowStockPanel productos={productosStockBajo} />
            </div>
            <div className="wide-panel">
              <InventoryMovementsPanel movimientos={movimientosInventario} />
            </div>
          </section>
        )}
        {!isCliente && view === "usuarios" && (
          <section className="management-grid">
          <div className="panel">
            <h2><UserPlus size={18} /> Usuario rapido</h2>
            <form className="compact-form" onSubmit={handleCreateUser}>
              <input name="nombre" placeholder="Nombre" required />
              <input name="email" type="email" placeholder="Correo" required />
              <input name="password" type="password" placeholder="Contrasena" required />
              <select name="rol" defaultValue="VENDEDOR" required>
                <option value="ADMIN">Administrador</option>
                <option value="VENDEDOR">Vendedor</option>
                <option value="ALMACEN">Almacen</option>
                <option value="CLIENTE">Cliente</option>
              </select>
              <select name="clienteId" defaultValue="">
                <option value="">Cliente asociado</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                ))}
              </select>
              <button type="submit">Guardar</button>
            </form>
          </div>
          <UsersPanel usuarios={usuarios} onToggleUser={handleToggleUser} />
        </section>
        )}
        {!isCliente && view === "clientes" && (
          <section className="management-grid">
            <div className="panel">
              <h2><UserPlus size={18} /> Cliente nuevo</h2>
              <form className="compact-form" onSubmit={handleCreateCliente}>
                <label>
                  Nombre del cliente
                  <input name="nombre" placeholder="Nombre" required />
                </label>
                <label>
                  Empresa
                  <input name="empresa" placeholder="Empresa" />
                </label>
                <label>
                  Telefono
                  <input name="telefono" placeholder="Telefono" />
                </label>
                <label>
                  Direccion
                  <input name="direccion" placeholder="Direccion" />
                </label>
                <label>
                  RFC
                  <input name="rfc" placeholder="RFC" />
                </label>
                <label>
                  Limite de credito
                  <input name="limiteCredito" type="number" min="0" step="0.01" placeholder="Limite de credito" defaultValue="0" />
                </label>
                <div className="form-section-title">Acceso del cliente</div>
                <label>
                  Nombre de usuario
                  <input name="usuarioNombre" placeholder="Nombre para iniciar sesion" required />
                </label>
                <label>
                  Correo de usuario
                  <input name="usuarioEmail" type="email" placeholder="Correo para login" required />
                </label>
                <label>
                  Contrasena
                  <input name="usuarioPassword" type="password" placeholder="Contrasena" minLength="6" required />
                </label>
                <button type="submit">Guardar</button>
              </form>
            </div>
            <ClientsPanel clientes={clientes} />
          </section>
        )}
        {view === "productos" && <ProductsPanel isCliente={isCliente} productos={productos} />}
        {view === "pedidos" && (
          <OrdersPanel
            clientes={clientes}
            isCliente={isCliente}
            canUpdatePedidoEstado={canUpdatePedidoEstado}
            pedidos={pedidos}
            productos={productos}
            onCreatePedido={handleCreatePedido}
            onUpdateEstado={handleUpdatePedidoEstado}
          />
        )}
        {!isCliente && view === "ventas" && (
          <SalesPanel
            productos={productos}
            ventas={ventas}
            onCreateVenta={handleCreateVenta}
          />
        )}
      </section>
    </main>
  );
}

const viewTitles = {
  dashboard: "Inventario y pedidos",
  inventario: "Gestion de inventario",
  productos: "Gestion de productos",
  usuarios: "Gestion de usuarios",
  clientes: "Gestion de clientes",
  pedidos: "Gestion de pedidos",
  ventas: "Gestion de ventas",
};

function InventoryEntryForm({ productos, almacenes, inventario, onSubmit, saving }) {
  const [productoId, setProductoId] = useState("");
  const [almacenId, setAlmacenId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [tipo, setTipo] = useState("ENTRADA");
  const [codigo, setCodigo] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const stockActual = inventario.find((item) => item.productoId === Number(productoId) && item.almacenId === Number(almacenId))?.cantidad ?? 0;
  const cantidadValida = Number.isInteger(Number(cantidad)) && Number(cantidad) > 0;
  const insuficiente = tipo === "SALIDA" && cantidadValida && Number(cantidad) > stockActual;
  function scan(scannedCode = codigo) {
    const producto = productos.find((item) => item.activo && item.codigoBarras === scannedCode.trim());
    if (!producto) {
      setProductoId("");
      setCantidad("");
      setScanStatus("Código no registrado. Crea el producto o vincula este código a uno existente.");
      return;
    }
    setCantidad((actual) => String(productoId === String(producto.id) ? (Number(actual) || 0) + 1 : 1));
    setProductoId(String(producto.id));
    setScanStatus(`${producto.nombre} seleccionado. Cada lectura suma una unidad; revisa la cantidad antes de confirmar.`);
    setCodigo("");
  }
  return (
    <>
      <h2><Boxes size={18} /> Altas y bajas de existencias</h2>
      <p>Escanea con un lector USB o escribe el código y pulsa Buscar. Revisa el movimiento antes de confirmarlo.</p>
      <form className="compact-form" onSubmit={(event) => { if (insuficiente) { event.preventDefault(); return; } onSubmit(event); }} onReset={() => { setProductoId(""); setAlmacenId(""); setCantidad(""); setCodigo(""); setScanStatus(""); }}>
        <label>Operación<select name="tipo" value={tipo} onChange={(event) => setTipo(event.target.value)}><option value="ENTRADA">Alta: agregar existencias</option><option value="SALIDA">Baja: retirar existencias</option></select></label>
        <label>Escanear código de barras<input value={codigo} maxLength="100" onChange={(event) => setCodigo(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scan(); } }} placeholder="Código de barras" /></label>
        <button type="button" onClick={() => scan()} disabled={saving || !codigo.trim()}>Buscar código</button>
        <BarcodeCameraButton disabled={saving} onDetected={(code) => { setCodigo(code); scan(code); }} />
        {scanStatus && <p role="status">{scanStatus}</p>}
        <label>Producto
          <select name="productoId" required value={productoId} onChange={(event) => { setProductoId(event.target.value); setCantidad(""); setScanStatus(""); }}>
            <option value="">Selecciona un producto</option>
            {productos.filter((producto) => producto.activo).map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} — {producto.sku}</option>)}
          </select>
        </label>
        <label>Almacén
          <select name="almacenId" required value={almacenId} onChange={(event) => setAlmacenId(event.target.value)}>
            <option value="">Selecciona un almacén</option>
            {almacenes.map((almacen) => <option key={almacen.id} value={almacen.id}>{almacen.nombre}</option>)}
          </select>
        </label>
        <label>{tipo === "ENTRADA" ? "Cantidad a ingresar" : "Cantidad a retirar"}
          <input name="cantidad" type="number" min="1" step="1" required value={cantidad} onChange={(event) => setCantidad(event.target.value)} placeholder="Ej. 20" />
        </label>
        {productoId && almacenId && <p className="inventory-stock-preview" aria-live="polite">Stock actual: <strong>{stockActual}</strong>{cantidadValida && !insuficiente && <> · Stock después del movimiento: <strong>{stockActual + (tipo === "ENTRADA" ? 1 : -1) * Number(cantidad)}</strong></>}</p>}
        {insuficiente && <p role="alert">No hay existencias suficientes en este almacén.</p>}
        {tipo === "SALIDA" && <label>Motivo de baja<select name="motivo" required defaultValue=""><option value="">Selecciona un motivo</option><option value="VENTA">Venta</option><option value="MERMA">Merma</option><option value="VENCIDO">Vencimiento</option><option value="DANO">Daño</option><option value="DEVOLUCION_PROVEEDOR">Devolución a proveedor</option><option value="OTRO">Otro</option></select></label>}
        <label>Nota (opcional)<input name="nota" placeholder="Ej. Recepción de mercadería" /></label>
        <button type="submit" disabled={saving || insuficiente || !productos.some((producto) => producto.activo) || !almacenes.length}>{saving ? "Guardando…" : tipo === "ENTRADA" ? "Confirmar alta" : "Confirmar baja"}</button>
      </form>
    </>
  );
}

function BarcodeAssignmentForm({ productos, api, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const codigoBarras = String(form.get("codigoBarras")).trim();
    if (!codigoBarras) { setMessage("Ingresa un código de barras."); return; }
    setSaving(true);
    try {
      const producto = await api(`/productos/${form.get("productoId")}/codigo-barras`, { method: "PATCH", body: JSON.stringify({ codigoBarras }) });
      setMessage(`Código vinculado a ${producto.nombre}.`);
      element.reset();
      await onSaved();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }
  return <details className="inventory-adjustments">
    <summary>Vincular código a un producto existente</summary>
    <p>Selecciona el producto y escanea su código. Guardar reemplaza el código anterior.</p>
    <form className="compact-form" onSubmit={submit}>
      <label>Producto<select name="productoId" required defaultValue=""><option value="">Selecciona un producto</option>{productos.filter((producto) => producto.activo).map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre} — {producto.codigoBarras || "Sin código"}</option>)}</select></label>
      <BarcodeInput required />
      <button disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar código"}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}

function InventoryPanel({ inventario }) {
  return (
    <section className="panel">
      <h2><Boxes size={18} /> Inventario</h2>
      <table>
        <thead>
          <tr><th>Producto</th><th>Almacen</th><th>Cantidad</th></tr>
        </thead>
        <tbody>
          {inventario.map((item) => (
            <tr key={item.id}>
              <td>{item.producto.nombre}</td>
              <td>{item.almacen.nombre}</td>
              <td>{item.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function LowStockPanel({ productos }) {
  return (
    <section className="panel">
      <h2><AlertTriangle size={18} /> Stock bajo</h2>
      {productos.length === 0 ? (
        <p className="empty-state">No hay productos por debajo del minimo.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Producto</th><th>Disponible</th><th>Minimo</th><th>Faltan</th></tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id}>
                <td>{producto.nombre}</td>
                <td>{producto.disponible}</td>
                <td>{producto.stockMinimo}</td>
                <td>{Math.max(producto.stockMinimo - producto.disponible, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function InventoryMovementsPanel({ movimientos }) {
  return (
    <section className="panel">
      <h2><History size={18} /> Movimientos de inventario</h2>
      {movimientos.length === 0 ? (
        <p className="empty-state">Todavia no hay movimientos registrados.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Referencia</th><th>Nota</th></tr>
          </thead>
          <tbody>
            {movimientos.slice(0, 12).map((movimiento) => (
              <tr key={movimiento.id}>
                <td>{new Date(movimiento.createdAt).toLocaleDateString()}</td>
                <td>{movimiento.producto?.nombre || "-"}</td>
                <td><span className={`movement-badge ${movimiento.tipo.toLowerCase()}`}>{movimiento.tipo}</span></td>
                <td>{movimiento.cantidad}</td>
                <td>{formatMovementReason(movimiento)}</td>
                <td>{movimiento.referencia || "-"}</td>
                <td>{movimiento.nota || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function formatMovementReason(movimiento) {
  if (!movimiento.referencia?.startsWith("BAJA_")) return "-";

  return movimiento.referencia
    .replace("BAJA_", "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function RecentOrdersPanel({ pedidos }) {
  return (
    <section className="panel">
      <h2><ClipboardList size={18} /> Pedidos recientes</h2>
      <OrdersTable pedidos={pedidos.slice(0, 8)} />
    </section>
  );
}

function UsersPanel({ usuarios, onToggleUser }) {
  return (
    <section className="panel">
      <h2><Users size={18} /> Usuarios</h2>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Cliente</th><th>Estado</th><th>Accion</th></tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <tr key={usuario.id}>
              <td>{usuario.nombre}</td>
              <td>{usuario.email}</td>
              <td>{usuario.rol}</td>
              <td>{usuario.cliente?.nombre || "-"}</td>
              <td>{usuario.activo ? "Activo" : "Inactivo"}</td>
              <td>
                <button className="table-action" onClick={() => onToggleUser(usuario)}>
                  {usuario.activo ? "Desactivar" : "Activar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ClientsPanel({ clientes }) {
  return (
    <section className="panel">
      <h2><Users size={18} /> Clientes</h2>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Empresa</th><th>Telefono</th><th>Usuario</th><th>Credito</th><th>Saldo</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => (
            <tr key={cliente.id}>
              <td>{cliente.nombre}</td>
              <td>{cliente.empresa || "-"}</td>
              <td>{cliente.telefono || "-"}</td>
              <td>{cliente.usuarios?.map((usuario) => usuario.email).join(", ") || "-"}</td>
              <td>Q {Number(cliente.limiteCredito).toFixed(2)}</td>
              <td>Q {Number(cliente.saldoPendiente).toFixed(2)}</td>
              <td>{cliente.activo ? "Activo" : "Inactivo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function getAvailableStock(producto) {
  return producto.inventario?.reduce((sum, item) => sum + item.cantidad, 0) || 0;
}

function getFormDetalles(form) {
  const productoIds = form.getAll("productoId");
  const cantidades = form.getAll("cantidad");

  return productoIds
    .map((productoId, index) => ({
      productoId,
      cantidad: cantidades[index],
    }))
    .filter((detalle) => detalle.productoId && Number(detalle.cantidad) > 0);
}

function ProductsPanel({ isCliente = false, productos }) {
  return (
    <section className="panel">
      <h2><Boxes size={18} /> {isCliente ? "Productos disponibles" : "Productos"}</h2>
      <ProductsTable isCliente={isCliente} productos={productos} />
    </section>
  );
}

function ProductsTable({ productos, isCliente = false }) {
  return (
    <table>
      <thead>
        <tr>
          <th>SKU</th><th>Nombre</th><th>Categoria</th><th>Marca</th><th>Unidad</th><th>Disponible</th><th>Precio</th>
          {!isCliente && <th>Estado</th>}
        </tr>
      </thead>
      <tbody>
        {productos.map((producto) => (
          <tr key={producto.id}>
            <td>{producto.sku}</td>
            <td>{producto.nombre}</td>
            <td>{producto.categoria?.nombre || "-"}</td>
            <td>{producto.marca?.nombre || "-"}</td>
            <td>{producto.unidad}</td>
            <td>{getAvailableStock(producto)}</td>
            <td>Q {Number(producto.precioVenta).toFixed(2)}</td>
            {!isCliente && <td>{producto.activo ? "Activo" : "Inactivo"}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const pedidoEstados = ["BORRADOR", "PENDIENTE", "APROBADO", "SURTIDO", "ENTREGADO", "CANCELADO"];

function OrdersPanel({ clientes, isCliente, canUpdatePedidoEstado, pedidos, productos, onCreatePedido, onUpdateEstado }) {
  return (
    <section className="management-grid">
      <div className="panel">
        <h2><ClipboardList size={18} /> {isCliente ? "Productos disponibles" : "Pedido nuevo"}</h2>
        <form className="compact-form" onSubmit={onCreatePedido}>
          {!isCliente && (
            <label>
              Cliente
              <select name="clienteId" defaultValue="" required>
                <option value="">Selecciona un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <OrderItemFields productos={productos} index={1} />
          <OrderItemFields productos={productos} index={2} />
          <OrderItemFields productos={productos} index={3} />
          <label>
            Observaciones
            <input name="observaciones" placeholder="Nota del pedido" />
          </label>
          <button type="submit">Crear pedido</button>
        </form>
      </div>
      <div className="panel">
        <h2><ClipboardList size={18} /> {isCliente ? "Mis pedidos" : "Pedidos"}</h2>
        <OrdersTable
          isCliente={isCliente}
          pedidos={pedidos}
          onUpdateEstado={canUpdatePedidoEstado ? onUpdateEstado : null}
        />
      </div>
    </section>
  );
}

function OrderItemFields({ productos, index }) {
  const productosDisponibles = productos.filter((producto) => getAvailableStock(producto) > 0);

  return (
    <div className="order-item-row">
      <label>
        Producto {index}
        <select name="productoId" defaultValue="" required={index === 1}>
          <option value="">Selecciona un producto</option>
          {productosDisponibles.map((producto) => (
            <option key={producto.id} value={producto.id}>
              {producto.nombre} - Q {Number(producto.precioVenta).toFixed(2)} - Disp. {getAvailableStock(producto)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad
        <input name="cantidad" type="number" min="1" step="1" placeholder="0" required={index === 1} />
      </label>
    </div>
  );
}

function OrdersTable({ isCliente = false, pedidos, onUpdateEstado }) {
  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          {!isCliente && <th>Cliente</th>}
          {!isCliente && <th>Vendedor</th>}
          <th>Estado</th><th>Items</th><th>Total</th><th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {pedidos.map((pedido) => (
          <tr key={pedido.id}>
            <td>#{pedido.id}</td>
            {!isCliente && <td>{pedido.cliente.nombre}</td>}
            {!isCliente && <td>{pedido.vendedor?.nombre || "-"}</td>}
            <td>
              {onUpdateEstado ? (
                <select
                  className="table-select"
                  value={pedido.estado}
                  onChange={(event) => onUpdateEstado(pedido.id, event.target.value)}
                >
                  {pedidoEstados.map((estado) => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              ) : pedido.estado}
            </td>
            <td>{pedido.detalles?.reduce((sum, detalle) => sum + detalle.cantidad, 0) || 0}</td>
            <td>Q {Number(pedido.total).toFixed(2)}</td>
            <td>{new Date(pedido.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SalesPanel({ productos, ventas, onCreateVenta }) {
  const totalVendido = ventas.reduce((sum, venta) => sum + Number(venta.total), 0);
  const productosVendidos = ventas.reduce(
    (sum, venta) => sum + venta.detalles.reduce((detalleSum, detalle) => detalleSum + detalle.cantidad, 0),
    0,
  );

  return (
    <section className="sales-layout">
      <div className="panel sales-summary">
        <h2><ReceiptText size={18} /> Resumen de ventas</h2>
        <div>
          <p>Ventas cerradas</p>
          <strong>{ventas.length}</strong>
        </div>
        <div>
          <p>Total vendido</p>
          <strong>Q {totalVendido.toFixed(2)}</strong>
        </div>
        <div>
          <p>Productos vendidos</p>
          <strong>{productosVendidos}</strong>
        </div>
      </div>
      <section className="management-grid">
        <div className="panel">
          <h2><ReceiptText size={18} /> Nueva venta</h2>
          <form className="compact-form" onSubmit={onCreateVenta}>
            <OrderItemFields productos={productos} index={1} />
            <OrderItemFields productos={productos} index={2} />
            <OrderItemFields productos={productos} index={3} />
            <label>
              Observaciones
              <input name="observaciones" placeholder="Nota de venta o referencia" />
            </label>
            <button type="submit">Registrar venta</button>
          </form>
        </div>
        <div className="panel">
          <h2><Boxes size={18} /> Productos disponibles</h2>
          <ProductsTable productos={productos.filter((producto) => getAvailableStock(producto) > 0)} />
        </div>
      </section>
      <div className="panel">
        <h2><ReceiptText size={18} /> Ventas</h2>
        <SalesTable ventas={ventas} />
      </div>
    </section>
  );
}

function SalesTable({ ventas }) {
  return (
    <table>
      <thead>
        <tr><th>ID</th><th>Empleado</th><th>Productos</th><th>Fecha</th><th>Total</th></tr>
      </thead>
      <tbody>
        {ventas.map((venta) => (
          <tr key={venta.id}>
            <td>#{venta.id}</td>
            <td>{venta.empleado?.nombre || "-"}</td>
            <td>{venta.detalles.reduce((sum, detalle) => sum + detalle.cantidad, 0)}</td>
            <td>{new Date(venta.createdAt).toLocaleDateString()}</td>
            <td>Q {Number(venta.total).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Metric({ icon, label, value, onClick }) {
  return (
    <button className="metric" type="button" onClick={onClick}>
      {icon}
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </button>
  );
}

createRoot(document.getElementById("root")).render(<App />);
