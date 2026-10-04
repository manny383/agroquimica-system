# Despliegue en Railway

Esta versión incorpora códigos de barras opcionales y únicos, vinculación a productos existentes y altas/bajas de inventario por escaneo USB.

## Servicios

| Configuración | Backend | Frontend |
| --- | --- | --- |
| Root Directory | `/backend` | `/frontend` |
| Config File | `/backend/railway.json` | `/frontend/railway.json` |
| Build Command | `npm run build` | `npm run build` |
| Start Command | `npm run railway:start` | `npm start` |
| Healthcheck | `/api/health` | `/` |

Conectar ambos servicios al repositorio `manny383/agroquimica-system` y a la rama que contenga estos cambios. La ubicación del archivo de configuración es relativa al repositorio, incluso cuando se define Root Directory.

## Variables

Backend:
- `DATABASE_URL`: conservar la conexión MySQL existente de Railway. No usar la conexión localhost del archivo `.env` local.
- `JWT_SECRET`: conservar el secreto actual.
- `NODE_ENV=production`.
- `PORT`: proporcionado por Railway.

Frontend:
- `VITE_API_URL=https://agroquimica-system-production.up.railway.app/api` (confirmar que sigue siendo el dominio del backend).
- `PORT`: proporcionado por Railway.

Vite incorpora `VITE_API_URL` durante la compilación. Configurar esta variable antes de desplegar el frontend; los archivos `.env` locales no están incluidos en Git.

## Publicación

1. Revisar los cambios y publicarlos en la rama conectada a Railway.
2. Desplegar primero el backend. Su arranque ejecuta `prisma db push` para añadir `Producto.codigoBarras` y el índice único. Los productos existentes conservan sus datos y quedan sin código asignado.
3. Verificar los logs de Prisma y la respuesta de `/api/health`.
4. Desplegar el frontend después de que el backend esté activo.
5. Iniciar sesión como administrador y abrir Inventario.

No se usa `prisma migrate deploy`: el repositorio no contiene una migración inicial completa y el despliegue existente sincroniza el esquema con `db push`. No ejecutar además el SQL de códigos de barras sobre una base que ya haya sido sincronizada. No añadir `--accept-data-loss` al arranque.

La carga `npm run seed` se retiró del arranque automático porque restablece la cuenta de administrador y crea datos de ejemplo. En la base existente de Railway se conservan los usuarios y datos actuales.

## Comprobación funcional

- Vincular un código a un producto existente y comprobar que no se puede repetir en otro producto.
- Escanear el código con Enter: debe seleccionar el producto y sumar una unidad por lectura sin guardar automáticamente.
- Elegir almacén y confirmar una entrada pequeña; verificar stock e historial.
- Confirmar una salida con motivo; verificar que descuenta las unidades.
- Intentar retirar más unidades que las disponibles: debe bloquearse.
- Crear un producto con código y stock inicial; verificar el producto y sus existencias.

El frontend incluye el botón **Escanear con cámara** para registrar códigos, vincularlos y buscar productos en altas/bajas. Publicar también `frontend/package.json` y `frontend/package-lock.json` para instalar el lector ZXing en Railway.

Probar desde el celular usando la URL HTTPS del frontend y permitir el acceso a la cámara. La cámara trasera se solicita cuando está disponible. Una lectura cierra la cámara y carga el código; el usuario debe confirmar el formulario para guardar. Verificar también el cierre manual, permisos denegados y códigos no registrados. El acceso desde una IP local mediante HTTP puede impedir el uso de la cámara; usar HTTPS o localhost.

La impresión de etiquetas no forma parte de esta versión.

Referencia: https://docs.railway.com/deployments/monorepo
