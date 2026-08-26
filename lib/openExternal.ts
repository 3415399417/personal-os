"use client";

/**
 * 打开外部链接（统一走服务端 API，绕开 WebView window.open 拦截与 Tauri 注入问题）：
 * POST /api/open-external → 服务端用系统默认浏览器打开
 * 网页版同样走 API（服务端打开默认浏览器 = 当前浏览器新标签，体验一致）
 */
export function openExternal(url: string) {
  if (!/^https?:\/\//i.test(url)) return;
  fetch("/api/open-external", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).catch(() => {
    // API 不可用（极少见）→ fallback 直接打开
    window.open(url, "_blank", "noopener");
  });
}

/** 判断是否运行在 Tauri 桌面壳内（当前仅用于展示，不参与打开逻辑） */
export function isDesktop(): boolean {
  try {
    return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
  } catch {
    return false;
  }
}
