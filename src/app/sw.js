import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

// Avisos enviados desde el servidor (ver scripts/avisos.mjs).
self.addEventListener("push", (event) => {
  let aviso = { titulo: "Pulse", cuerpo: "Tienes un recordatorio.", url: "/" };
  try {
    aviso = { ...aviso, ...event.data.json() };
  } catch {
    // Si el mensaje no es JSON, se muestra el aviso por defecto.
  }

  event.waitUntil(
    self.registration.showNotification(aviso.titulo, {
      body: aviso.cuerpo,
      icon: "/bulldog-192.png",
      badge: "/bulldog-192.png",
      data: { url: aviso.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientes) => {
      const abierta = clientes.find((cliente) => "focus" in cliente);
      if (abierta) return abierta.focus();
      return self.clients.openWindow(url);
    }),
  );
});
