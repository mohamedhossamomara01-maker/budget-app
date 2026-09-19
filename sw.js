// ══════════════════════════════════════════════════════════════
// Service Worker — بيستقبل تذكير الصلاة حتى لو التطبيق مقفول خالص
// حطه جنب app.js في نفس مجلد الموقع بالظبط (نفس اللي فيه index.html)
// ══════════════════════════════════════════════════════════════

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// لما يوصل إشعار (Push) من السيرفر
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "🕌 تذكير الصلاة", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "🕌 تذكير الصلاة";
  const options = {
    body: data.body || "",
    tag: data.tag || "prayer-reminder",
    renotify: true,
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// لما المستخدم يدوس على الإشعار، يفتح/يرجع للتطبيق
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
