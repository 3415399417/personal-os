/* BetterLife AI Service Worker：App Shell 缓存 + 运行时缓存静态资源
 * 策略：
 *  - 预缓存：首页/app shell（HTML + 静态资源）→ 秒开 + 离线可用骨架
 *  - 运行时缓存：/icons、/art、/_next/static（stale-while-revalidate）
 *  - 网络优先：/api/*（数据永远要最新的，失败时才回退缓存）
 */
const VERSION = "betterlife-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;

// 预缓存 app shell：页面骨架（构建时页面路径；未命中也不阻塞）
const SHELL_URLS = [
  "/",
  "/today",
  "/projects",
  "/notes",
  "/assets",
  "/learning",
  "/review",
  "/inbox",
  "/github",
  "/stats",
  "/workbench",
  "/settings",
  "/space",
  "/space/badges",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {}) // 预缓存失败不阻塞安装
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域（AI 接口等）不干预

  // API 请求：网络优先，失败回退缓存
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || Response.error())),
    );
    return;
  }

  // 静态资源（next 构建产物 / 图标 / art）：stale-while-revalidate
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/art/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // 页面导航：网络优先（保持最新），离线时回退 shell 缓存
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/").then((home) => home || Response.error())),
        ),
    );
    return;
  }
});
