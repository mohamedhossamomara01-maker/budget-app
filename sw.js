// ══════════════════════════════════════════════════════════════
// Service Worker — بيستقبل تذكير الصلاة حتى لو التطبيق مقفول خالص
// حطه جنب app.js في نفس مجلد الموقع بالظبط (نفس اللي فيه index.html)
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// الاستخدام من غير نت: التطبيق نفسه (index.html + app.js + الأيقونات) والمكتبات (React/Supabase)
// والخطوط (كايرو + أميري قرآن) بيتخزنوا تلقائي أول ما تفتح التطبيق بنت،
// وبعد كده بيشتغلوا من غير نت. الملفات بتتجدد من النت أول ما يبقى فيه نت (network-first).
// ══════════════════════════════════════════════════════════════
const SHELL_CACHE = "rafiqi-shell-v1";
const LIB_CACHE = "rafiqi-libs-v1";
const SHELL_FILES = ["./", "./index.html", "./app.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];
const LIB_URLS = [
  "https://unpkg.com/react@18.2.0/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Amiri+Quran&display=swap"
];
const LIB_HOSTS = ["unpkg.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      const shell = await caches.open(SHELL_CACHE);
      await Promise.all(SHELL_FILES.map(f => shell.add(new Request(f, { cache: "reload" })).catch(() => {})));
      const libs = await caches.open(LIB_CACHE);
      await Promise.all(LIB_URLS.map(u => libs.add(new Request(u, { mode: "cors" })).catch(() => {})));
    } catch (e) {}
    self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, LIB_CACHE, "quran-audio-v1", "rafiqi-data-v1"];
    const names = await caches.keys();
    await Promise.all(names.filter(n => !keep.includes(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// network-first مع مهلة: لو النت ضعيف/مقطوع نرجع للنسخة المخزّنة بسرعة بدل ما التطبيق يفضل بيحمّل
async function networkFirst(req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(t);
    if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === "navigate") {
      const idx = await cache.match("./index.html");
      if (idx) return idx;
    }
    return Response.error();
  }
}
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && (res.status === 200 || res.type === "opaque")) cache.put(req, res.clone()).catch(() => {});
  return res;
}

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
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  // صوتيات المصحف: بنتجاهل طلبات الـ Range عشان منخزنش جزء ناقص من الملف بالغلط
  if (isAudioRequest(req.url)) {
    if (req.headers.has("range")) return;
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
    return;
  }
  // ملفات التطبيق نفسه
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith("/sw.js")) return;
    event.respondWith(networkFirst(req, SHELL_CACHE, 4000));
    return;
  }
  // مكتبات وخطوط
  if (LIB_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req, LIB_CACHE).catch(() => Response.error()));
  }
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
  const tag = data.tag || "prayer-reminder";
  const options = {
    body: data.body || "",
    tag,
    renotify: true,
    requireInteraction: false,
    // عند دوس المستخدم على الإشعار، افتح التطبيق مع علامة تشغّل صوت الأذان تلقائي لو الإشعار ده تذكير صلاة
    icon: "icon-192.png",
    badge: "icon-192.png",
    dir: "rtl",
    lang: "ar",
    // go = شاشة في التطبيق تتفتح لما تدوس على الإشعار (أذكار الصباح، المصحف، التحويش..)
    data: { url: data.url || (tag === "prayer-reminder" ? "./?adhan=1" : "./"), go: data.go || null }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// لما المستخدم يدوس على الإشعار، يفتح/يرجع للتطبيق (وبعلامة ?adhan=1 عشان يشغّل صوت الأذان تلقائي فور الفتح)
self.addEventListener("notificationclick", event => {
  event.notification.close();
  // تذكير مربوط بشاشة في التطبيق (data.go): ركّز على التطبيق وابعتله الوجهة، أو افتحه بالوجهة لو كان مقفول
  const d0 = event.notification.data || {};
  if (d0.go) {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
        for (const c of list) {
          if ("focus" in c) { c.focus(); c.postMessage({ type: "go", go: d0.go }); return; }
        }
        if (self.clients.openWindow) return self.clients.openWindow("./?go=" + encodeURIComponent(d0.go));
      })
    );
    return;
  }
  const openUrl = (event.notification.data && event.notification.data.url) || "./?adhan=1";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ("focus" in client) { client.focus(); if ("navigate" in client) client.navigate(openUrl); return; }
      }
      if (self.clients.openWindow) return self.clients.openWindow(openUrl);
    })
  );
});
