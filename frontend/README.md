# Frontend React — Dashboard Teleoperado de Excavadora IoT

Dashboard web interactivo en **React 19 + TypeScript + Tailwind CSS** para control en tiempo real y monitoreo de la excavadora IoT, conectado a la API FastAPI en AWS EC2 y canal WebSocket seguro (WSS).

---

## 🚀 Características

- **Telemetría WSS en Tiempo Real:** Visualización en vivo de eventos WebSocket (`MOVIMIENTO_INDIVIDUAL`, `ESTADO_INICIAL`, `DEMO_MOVIMIENTO`, etc.).
- **Navegación Táctil y Teclado:**
  - D-Pad visual con soporte completo para `WASD` y flechas de teclado.
  - Exclusión mutua visual y de hardware.
- **Control de Brazo y Cabina:**
  - Botones dedicados y atajos `H`, `J`, `K`, `L`.
- **Automatización DEMO:**
  - Selector de rutinas almacenadas en MySQL RDS.
  - Selector de velocidad (0.5x, 1.0x, 1.5x).
  - Barra de progreso en vivo sincronizada con los eventos del servidor.
  - Cancelación inmediata con parada de seguridad.
- **Seguridad:**
  - Botón prominente de **Parada de Emergencia** (`Espacio`) que apaga las 12 salidas simultáneamente.
- **Configuración Dinámica:**
  - Modal integrado para alternar fácilmente entre endpoints locales (`http://localhost:8000`) y AWS EC2 sin recompilar.

---

## 💻 Desarrollo Local (con `pnpm`)

```bash
# 1. Entrar al directorio del frontend
cd frontend

# 2. Instalar dependencias
pnpm install

# 3. Iniciar el servidor de desarrollo en http://localhost:3000
pnpm dev

# 4. Probar compilación para producción
pnpm build
```

---

## 🌐 Cómo Desplegar a Vercel en Monorepo

Dado que este proyecto es un **monorepo** que contiene `backend`, `firmware`, `db` y `frontend`, sigue estos sencillos pasos para desplegar en Vercel:

### Paso 1: Importar el Repositorio en Vercel
1. Ve a [vercel.com](https://vercel.com) e inicia sesión.
2. Haz clic en **"Add New..."** $\rightarrow$ **"Project"**.
3. Selecciona tu repositorio GitHub que contiene este monorepo.

### Paso 2: Configurar el "Root Directory" (Punto Crítico)
En la pantalla de configuración del proyecto (**Configure Project**):
1. Busca la opción **Root Directory**.
2. Haz clic en **Edit** y selecciona la carpeta **`frontend`** (o escribe `frontend`).
3. Vercel detectará automáticamente:
   - **Framework Preset:** `Vite`
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `pnpm install`

### Paso 3: Configurar Variables de Entorno (Environment Variables)
Despliega la sección **Environment Variables** y agrega las siguientes variables:

| Nombre de Variable | Valor de Ejemplo | Descripción |
|---|---|---|
| `VITE_API_BASE_URL` | `https://tu-servidor-ec2.compute.amazonaws.com` | URL pública de tu API FastAPI |
| `VITE_WS_BASE_URL` | `wss://tu-servidor-ec2.compute.amazonaws.com` | URL pública de WebSocket |
| `VITE_DEFAULT_VEHICULO_ID` | `1` | ID del vehículo por defecto |

> **Nota:** Si aún estás probando tu backend en HTTP/WS sin certificado SSL en un puerto como 8000, puedes colocar `http://tu-ip:8000` y `ws://tu-ip:8000` o usar la tuerca de configuración en la esquina superior derecha del dashboard para cambiar la URL en vivo sin redesplegar.

### Paso 4: Desplegar
Haz clic en **Deploy**. Vercel compilará el frontend en segundos y te entregará una URL pública tipo `https://tu-proyecto.vercel.app`.
