"use client";

/**
 * 打开外部链接：
 * - 桌面版（Tauri）：invoke Rust 命令 open_in_browser → 系统默认浏览器打开
 * - 浏览器：fallback window.open
 * 兼容 Tauri 2 两种全局 API 形态：__TAURI__.core.invoke 与 __TAURI__.invoke
 */
export function openExternal(url: string) {
  try {
    const w = window as unknown as {
      __TAURI__?: {
        core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
        invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
    };
    const tauri = w.__TAURI__;
    const invoke = tauri?.core?.invoke ?? tauri?.invoke;
    if (invoke) {
      invoke("open_in_browser", { url }).catch(() => {
        window.open(url, "_blank", "noopener");
      });
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
