# Sistema de Agroquimica

Sistema web para controlar productos, inventario, clientes y pedidos de una agroquimica.

## Arquitectura

- Backend: Node.js, Express, Prisma y MySQL.
- Frontend: React con Vite.
- Autenticacion: JWT con roles de Administrador, Vendedor y Almacen.

## Primeros pasos

```bash
cd backend
npm install
copy .env.example .env
npx prisma generate
npm run dev
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La API usa `http://localhost:3000` y el frontend `http://localhost:5173`.
