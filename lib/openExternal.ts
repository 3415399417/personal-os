"use client";

/**
 * 打开外部链接：
 * - 桌面版（Tauri）：走 opener 插件 → 系统默认浏览器打开（WebView 内 window.open 会被拦截）
 * - 浏览器：fallback window.open
 */
export function openExternal(url: string) {
  try {
    const tauri = (window as unknown as { __TAURI__?: { opener?: { openUrl: (u: string) => Promise<void> } } }).__TAURI__;
    if (tauri?.opener?.openUrl) {
      tauri.opener.openUrl(url).catch(() => window.open(url, "_blank", "noopener"));
      return;
    }
  } catch {
    /* 非 Tauri 环境 */
  }
  window.open(url, "_blank", "noopener");
}

/** 判断是否运行在 Tauri 桌面壳内 */
export function isDesktop(): boolean {
  try {
    return !!(window as unknown as { __TAURI__?: unknown }).__TAURI__;
  } catch {
    return false;
  }
}
