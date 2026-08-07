import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import almacenRoutes from "./routes/almacenes.routes.js";
import authRoutes from "./routes/auth.routes.js";
import clienteRoutes from "./routes/clientes.routes.js";
import inventarioRoutes from "./routes/inventario.routes.js";
import pedidoRoutes from "./routes/pedidos.routes.js";
import productoRoutes from "./routes/productos.routes.js";
import usuarioRoutes from "./routes/usuarios.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "agroquimica-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/almacenes", almacenRoutes);
app.use("/api/productos", productoRoutes);
app.use("/api/clientes", clienteRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/pedidos", pedidoRoutes);
app.use("/api/usuarios", usuarioRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
  });
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
