This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Seguridad de acceso

La app pide usuario y contraseña en un formulario de inicio de sesión (`/acceso`). Al entrar, el navegador guarda una cookie firmada que dura 30 días. Las rutas de API sin sesión responden 401.

Antes de iniciar el servidor, crea `.env.local` a partir de `.env.example` y completa todos los valores: usuario, contraseña, secreto de sesión y claves VAPID para las notificaciones. Si falta alguno de ellos, el servidor responde 503. No subas `.env.local` ni compartas sus valores.

Para acceder desde otro dispositivo, publica el servidor solo detrás de HTTPS y de una red privada de confianza (por ejemplo, Tailscale Serve). Las solicitudes de escritura desde navegadores también se limitan al mismo origen.

## PWA

La versión de producción incluye manifiesto instalable y service worker. Ejecuta `npm run build` y luego `npm run start`; durante `npm run dev` el service worker queda desactivado. Las rutas `/api/*` siempre van a la red y no se guardan en caché. Para instalar en un teléfono desde otro dispositivo, usa una conexión HTTPS de confianza.

La función de registro desde foto envía imágenes JPEG, PNG o WebP de hasta 8 MB al Claude CLI local. Requiere Claude Code actualizado (2.1.248 o posterior) y autenticado en la misma cuenta de Windows que ejecuta Next.js. En Windows, si la detección automática no encuentra la instalación global, configura `CLAUDE_CLI_ENTRY` en `.env.local` con la ruta completa al archivo `cli.js`. La estimación se revisa en el formulario antes de guardarse; el archivo temporal se elimina al terminar.

Nota de privacidad: Claude CLI se ejecuta en este equipo, pero envía la imagen al servicio de Anthropic para el análisis. No se guarda un historial de sesión y la copia temporal local se elimina al terminar.

## Comandos del servidor (uso diario)

Ejecútalos en PowerShell, dentro de la carpeta `mi-gym`.

Encender la app (compila y arranca en el puerto 3003, el que publica Tailscale):

```powershell
npm run produccion
```

Desconectar Tailscale (para probar que la app deja de cargar en el celular):

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" down
```

Volver a conectar Tailscale:

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" up
```

Ver el estado de Tailscale (PC y celular conectados):

```powershell
& "C:\Program Files\Tailscale\tailscale.exe" status
```

Dirección para abrir la app desde el celular:

```
https://TU-PC.TU-RED.ts.net
```

Si cambias código, vuelve a ejecutar `npm run produccion`: en producción los cambios no se ven hasta compilar de nuevo.
