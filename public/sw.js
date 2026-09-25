// PanicGuard Tactical Service Worker
const CACHE_NAME = "panicguard-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification handling in background / lock screen
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "🚨 ¡ALERTA DE PÁNICO ACTIVA!";
  const options = {
    body: data.body || "Emergencia en curso en terminal asignada.",
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    tag: "panic-alert",
    renotify: true,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 800],
    data: data.url || "/#guard",
    actions: [
      { action: "open", title: "Ver Emergencia" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event -> brings guard app to front
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "/#guard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
