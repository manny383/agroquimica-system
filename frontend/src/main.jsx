import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Boxes, ClipboardList, Leaf, LogIn, UserPlus, Users } from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
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
    if (!response.ok) throw new Error(data.message || "Error de API");
    return data;
  }

  async function loadData() {
    if (!token) return;
    try {
      const [productosData, clientesData, inventarioData, pedidosData, usuariosData] = await Promise.all([
        api("/productos"),
        api("/clientes"),
        api("/inventario"),
        api("/pedidos"),
        api("/usuarios"),
      ]);
      setProductos(productosData);
      setClientes(clientesData);
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
      setToken(data.token);
      setUser(data.user);
      setStatus("Sesion iniciada");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/usuarios", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.get("nombre"),
          email: form.get("email"),
          password: form.get("password"),
          rol: form.get("rol"),
        }),
      });
      event.currentTarget.reset();
      setStatus("Usuario creado");
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
        <button onClick={() => { localStorage.removeItem("token"); setToken(""); }}>Cerrar sesion</button>
        <nav className="side-nav">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <Boxes size={18} /> Panel principal
          </button>
          <button className={view === "usuarios" ? "active" : ""} onClick={() => setView("usuarios")}>
            <Users size={18} /> Usuarios
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
          <Metric icon={<Boxes />} label="Productos" value={productos.length} />
          <Metric icon={<Users />} label="Clientes" value={clientes.length} />
          <Metric icon={<ClipboardList />} label="Pedidos" value={pedidos.length} />
          <Metric icon={<UserPlus />} label="Usuarios" value={usuarios.length} />
        </div>
        {view === "dashboard" && (
          <>
            <section className="dashboard-grid">
              <InventoryPanel inventario={inventario} />
              <RecentOrdersPanel pedidos={pedidos} />
            </section>
          </>
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
                <option value="CLIENTE">Cliente</option>
              </select>
              <button type="submit">Guardar</button>
            </form>
          </div>
          <UsersPanel usuarios={usuarios} onToggleUser={handleToggleUser} />
        </section>
        )}
        {view === "pedidos" && <OrdersPanel pedidos={pedidos} />}
      </section>
    </main>
  );
}

const viewTitles = {
  dashboard: "Inventario y pedidos",
  usuarios: "Gestion de usuarios",
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
          <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Accion</th></tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <tr key={usuario.id}>
              <td>{usuario.nombre}</td>
              <td>{usuario.email}</td>
              <td>{usuario.rol}</td>
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

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      {icon}
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
