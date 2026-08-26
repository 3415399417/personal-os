"use client";

import { useEffect } from "react";

/**
 * Tauri 事件桥接：监听 Rust 侧 emit 的事件。
 * - Tauri 环境：用 __TAURI__.event.listen（Rust emit 的事件不会触发普通 DOM 事件）
 * - 浏览器环境（dev/网页版）：fallback 到 window.addEventListener（便于调试）
 */
export function useTauriEvent(eventName: string, handler: (payload: unknown) => void) {
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const tauri = (window as unknown as { __TAURI__?: { event?: { listen: (e: string, cb: (ev: { payload: unknown }) => void) => Promise<() => void> } } }).__TAURI__;

    if (tauri?.event?.listen) {
      let cancelled = false;
      tauri.event
        .listen(eventName, (ev) => {
          if (!cancelled) handler(ev.payload);
        })
        .then((fn) => {
          if (cancelled) fn();
          else unlisten = fn;
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        unlisten?.();
      };
    }

    // 浏览器 fallback（dev 调试用）
    const domHandler = (e: Event) => handler((e as CustomEvent).detail);
    window.addEventListener(eventName, domHandler as EventListener);
    return () => window.removeEventListener(eventName, domHandler as EventListener);
  }, [eventName, handler]);
}
