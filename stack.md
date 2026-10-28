# Stack: App personal de gym y nutrición

## Frontend y backend
- **Next.js** (App Router): pantallas y API routes en un solo proyecto.
- **React**: componentes de la interfaz.
- **Node.js LTS**: entorno de ejecución.

## Base de datos
- **SQLite** con **better-sqlite3**: archivo `gym.db` en la carpeta del proyecto. Sin servicio aparte.
- Tablas: `comidas`, `series`, `sueno`.
- Índices por fecha y por ejercicio.

## Estilos y componentes
- **Tailwind CSS**: estilos.
- **shadcn/ui**: componentes (tarjetas, botones, pestañas, diálogos) copiados al proyecto.
- Paleta: crema de fondo, teal como acento principal, coral para acciones y pendientes, verde menta para lo completado.
- Modo oscuro previsto con variables CSS (fondo #121417, tarjetas #1C2026).

## Gráficos, tablas e iconos
- **Recharts**: gráficos de progreso (proteína, peso, 1RM).
- **TanStack Table**: tablas con orden, filtro y paginación.
- **lucide-react**: iconos de interfaz.
- **react-icons** o **Simple Icons**: logos de marcas.

## PWA
- **Serwist 9** en modo configurator: compila el service worker después de Next.js y es compatible con Turbopack.
- Manifiesto de app, icono SVG, fallback offline y proveedor de registro. Las rutas `/api/*` usan solo red y no se cachean.
- Requiere HTTPS: usar **Tailscale** con `tailscale serve`.

## Análisis de fotos
- Route `/api/foto`: guarda la imagen en `uploads/` y ejecuta `claude -p` con `child_process.execFile`.
- Claude Code corre con `--restricted`, `--tools Read`, modo plan y un turno; Node valida el JSON. La imagen temporal se borra al terminar, y el usuario revisa la estimación antes de guardarla en SQLite.
- Permisos mínimos: solo lectura (sin escritura ni shell), cwd acotado a `uploads/`, nunca `--dangerously-skip-permissions`.
- Requiere Claude Code instalado y logueado en la PC.
- Runtime `nodejs` obligatorio en esa route.
- Validar el JSON: carbs y prot numéricos entre 0 y 300.

## Lógica de progreso
- Plan semanal en `lib/plan.js` (día de la semana → ejercicios).
- Progresión por doble rango: subir peso al completar el tope de repeticiones.
- 1RM estimado con Epley: `peso × (1 + reps / 30)`.

## Ejecución y despliegue local
- Desarrollo: `npm run dev`.
- Uso diario: `npm run build` y `npm run start`, dejado en el Programador de tareas de Windows (al iniciar sesión).
- Respaldo: copiar `gym.db` (y `gym.db-wal` y `gym.db-shm` si existen, cerrando antes el servidor).

## Comandos de instalación
```bash
npx create-next-app@latest mi-gym
cd mi-gym
npm install better-sqlite3 recharts @tanstack/react-table lucide-react
npx shadcn@latest init
```

## Decisiones descartadas
- NestJS: demasiada estructura para una app personal.
- Otros frameworks CSS (CSS-in-JS, Panda, UnoCSS): sin ventaja clara frente a Tailwind + shadcn.
- MySQL / XAMPP: innecesario, SQLite cubre el volumen.

## Implementación PWA
- La integración usa el modo configurator de Serwist, compatible con el Turbopack predeterminado de Next.js.
- `npm run build` compila Next.js y luego el service worker.
- Los datos `/api/*` usan estrategia de red solamente; el service worker no los guarda para acceso offline.
- El shell incluye manifiesto, icono SVG y página de fallback offline.

