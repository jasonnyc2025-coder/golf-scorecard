const CACHE = "golf-v6";

// 只预缓存静态资源，不缓存 index.html
const STATIC = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./screenshot-wide.png",
  "./screenshot-narrow.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())   // 立即激活，不等旧 SW 退出
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // 立即接管所有页面
  );
});

self.addEventListener("fetch", e => {
  const { request } = e;

  // HTML 导航请求：永远走网络，离线时才用缓存
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 其他静态资源：缓存优先
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
    })
  );
});

// 页面主动触发 skipWaiting（保留，兼容旧逻辑）
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
