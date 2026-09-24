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

// ══════════════════════════════════════════════════════════════
// كاش الصوتيات — أي سورة أو مقطع اتسمع مرة بيتحفظ تلقائي، وبعد كده
// بيشتغل من غير نت. شغال على ملفات المصحف والقراء (mp3/ogg) بس.
// ══════════════════════════════════════════════════════════════
const AUDIO_CACHE = "quran-audio-v1";
const AUDIO_HOSTS = ["everyayah.com", "mp3quran.net"];

function isAudioRequest(url) {
  try {
    const u = new URL(url);
    return AUDIO_HOSTS.some(h => u.hostname.endsWith(h)) && /\.(mp3|ogg)$/i.test(u.pathname);
  } catch (e) {
    return false;
  }
}

self.addEventListener("fetch", event => {
  const req = event.request;
  // بنتجاهل طلبات الـ Range (لما المستخدم يقفز جوه المقطع) عشان منخزنش
  // جزء ناقص من الملف بالغلط — بنكاش بس الطلب الكامل العادي
  if (req.method !== "GET" || req.headers.has("range") || !isAudioRequest(req.url)) return;
  event.respondWith(
    caches.open(AUDIO_CACHE).then(async cache => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok && res.status === 200) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return cached || Response.error();
      }
    })
  );
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
