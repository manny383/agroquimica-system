import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Boxes, ClipboardList, Leaf, LogIn, UserPlus, Users } from "lucide-react";
import "./styles.css";

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
  const [pedidos, setPedidos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [view, setView] = useState("dashboard");
  const [status, setStatus] = useState("");

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
      const [productosData, clientesData, almacenesData, categoriasData, marcasData, inventarioData, pedidosData, usuariosData] = await Promise.all([
        api("/productos"),
        api("/clientes"),
        api("/almacenes"),
        api("/categorias"),
        api("/marcas"),
        api("/inventario"),
        api("/pedidos"),
        api("/usuarios"),
      ]);
      setProductos(productosData);
      setClientes(clientesData);
      setAlmacenes(almacenesData);
      setCategorias(categoriasData);
      setMarcas(marcasData);
      setInventario(inventarioData);
      setPedidos(pedidosData);
      setUsuarios(usuariosData);
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    loadData();
  }, [token]);

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
    try {
      await api("/clientes", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.get("nombre"),
          empresa: form.get("empresa"),
          telefono: form.get("telefono"),
          direccion: form.get("direccion"),
          rfc: form.get("rfc"),
          limiteCredito: form.get("limiteCredito"),
        }),
      });
      formElement.reset();
      setStatus("Cliente creado");
      loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleAdjustInventory(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await api("/inventario/ajustes", {
        method: "POST",
        body: JSON.stringify({
          productoId: form.get("productoId"),
          almacenId: form.get("almacenId"),
          tipo: form.get("tipo"),
          cantidad: form.get("cantidad"),
          nota: form.get("nota"),
        }),
      });
      formElement.reset();
      setStatus("Inventario actualizado");
      loadData();
    } catch (error) {
      setStatus(error.message);
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
      nombre: form.get("nombre"),
      descripcion: form.get("descripcion"),
      unidad: form.get("unidad"),
      precioVenta: form.get("precioVenta"),
      stockMinimo: form.get("stockMinimo"),
    };

    if (almacenId && cantidadInicial !== "") {
      payload.inventarioInicial = {
        almacenId,
        cantidad: cantidadInicial,
        nota: form.get("nota"),
      };
    }

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
      setStatus("Producto e inventario creados");
      loadData();
    } catch (error) {
      setStatus(error.message);
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
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <Boxes size={18} /> Panel principal
          </button>
          <button className={view === "inventario" ? "active" : ""} onClick={() => setView("inventario")}>
            <Boxes size={18} /> Inventario
          </button>
          <button className={view === "usuarios" ? "active" : ""} onClick={() => setView("usuarios")}>
            <Users size={18} /> Usuarios
          </button>
          <button className={view === "clientes" ? "active" : ""} onClick={() => setView("clientes")}>
            <UserPlus size={18} /> Clientes
          </button>
          <button className={view === "pedidos" ? "active" : ""} onClick={() => setView("pedidos")}>
            <ClipboardList size={18} /> Pedidos
          </button>
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
          <Metric icon={<Boxes />} label="Productos" value={productos.length} onClick={() => setView("productos")} />
          <Metric icon={<Users />} label="Clientes" value={clientes.length} onClick={() => setView("clientes")} />
          <Metric icon={<ClipboardList />} label="Pedidos" value={pedidos.length} onClick={() => setView("pedidos")} />
          <Metric icon={<UserPlus />} label="Usuarios" value={usuarios.length} onClick={() => setView("usuarios")} />
        </div>
        {view === "dashboard" && (
          <>
            <section className="dashboard-grid">
              <InventoryPanel inventario={inventario} />
              <RecentOrdersPanel pedidos={pedidos} />
            </section>
          </>
        )}
        {view === "inventario" && (
          <section className="management-grid">
            <div className="panel">
              <h2><Boxes size={18} /> Producto nuevo</h2>
              <form className="compact-form" onSubmit={handleCreateProductWithInventory}>
                <label>
                  SKU
                  <input name="sku" placeholder="SKU" required />
                </label>
                <label>
                  Nombre del producto
                  <input name="nombre" placeholder="Nombre del producto" required />
                </label>
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
                <button type="submit">Crear producto</button>
              </form>
            </div>
            <div className="panel">
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
                <input name="cantidad" type="number" min="1" step="1" placeholder="Cantidad" required />
                <input name="nota" placeholder="Nota" />
                <button type="submit">Guardar</button>
              </form>
            </div>
            <div className="wide-panel">
              <InventoryPanel inventario={inventario} />
            </div>
          </section>
        )}
        {view === "usuarios" && (
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
              </select>
              <button type="submit">Guardar</button>
            </form>
          </div>
          <UsersPanel usuarios={usuarios} onToggleUser={handleToggleUser} />
        </section>
        )}
        {view === "clientes" && (
          <section className="management-grid">
            <div className="panel">
              <h2><UserPlus size={18} /> Cliente rapido</h2>
              <form className="compact-form" onSubmit={handleCreateCliente}>
                <input name="nombre" placeholder="Nombre" required />
                <input name="empresa" placeholder="Empresa" />
                <input name="telefono" placeholder="Telefono" />
                <input name="direccion" placeholder="Direccion" />
                <input name="rfc" placeholder="RFC" />
                <input name="limiteCredito" type="number" min="0" step="0.01" placeholder="Limite de credito" defaultValue="0" />
                <button type="submit">Guardar</button>
              </form>
            </div>
            <ClientsPanel clientes={clientes} />
          </section>
        )}
        {view === "productos" && <ProductsPanel productos={productos} />}
        {view === "pedidos" && <OrdersPanel pedidos={pedidos} />}
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
};

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
          <tr><th>Nombre</th><th>Empresa</th><th>Telefono</th><th>Credito</th><th>Saldo</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {clientes.map((cliente) => (
            <tr key={cliente.id}>
              <td>{cliente.nombre}</td>
              <td>{cliente.empresa || "-"}</td>
              <td>{cliente.telefono || "-"}</td>
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

function ProductsPanel({ productos }) {
  return (
    <section className="panel">
      <h2><Boxes size={18} /> Productos</h2>
      <table>
        <thead>
          <tr><th>SKU</th><th>Nombre</th><th>Categoria</th><th>Marca</th><th>Unidad</th><th>Precio</th><th>Stock minimo</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {productos.map((producto) => (
            <tr key={producto.id}>
              <td>{producto.sku}</td>
              <td>{producto.nombre}</td>
              <td>{producto.categoria?.nombre || "-"}</td>
              <td>{producto.marca?.nombre || "-"}</td>
              <td>{producto.unidad}</td>
              <td>Q {Number(producto.precioVenta).toFixed(2)}</td>
              <td>{producto.stockMinimo}</td>
              <td>{producto.activo ? "Activo" : "Inactivo"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function OrdersPanel({ pedidos }) {
  return (
    <section className="panel">
      <h2><ClipboardList size={18} /> Pedidos</h2>
      <OrdersTable pedidos={pedidos} />
    </section>
  );
}

function OrdersTable({ pedidos }) {
  return (
    <table>
      <thead>
        <tr><th>ID</th><th>Cliente</th><th>Estado</th><th>Total</th></tr>
      </thead>
      <tbody>
        {pedidos.map((pedido) => (
          <tr key={pedido.id}>
            <td>#{pedido.id}</td>
            <td>{pedido.cliente.nombre}</td>
            <td>{pedido.estado}</td>
            <td>Q {Number(pedido.total).toFixed(2)}</td>
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
