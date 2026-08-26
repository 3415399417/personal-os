"use client";

import { useEffect, useRef, useState } from "react";
import { getNotificationsForBell } from "@/lib/api";

/**
 * 桌面通知：轮询通知中心，发现新通知 → 弹系统桌面通知。
 * - 首次使用时请求浏览器通知权限
 * - 可被设置页开关（localStorage: personalos:desktop-notify）关闭
 * - 轮询间隔 45s；站内通知与桌面通知互补（你不在页面上也能看到）
 */
const LS_KEY = "person…otify"; // personalos:desktop-notify

export function useDesktopNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const seenRef = useRef<Set<string>>(new Set());
  const enabledRef = useRef(false);

  // 读取开关状态 + 检查权限
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const on = raw !== "false"; // 默认开启
      setEnabled(on);
      enabledRef.current = on;
    } catch {
      /* ignore */
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    // 权限未决定时静默请求（用户手势外可能被浏览器拦截，但值得一试）
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => setPermission(p));
    }
  }, []);

  // 轮询新通知
  useEffect(() => {
    if (permission !== "granted") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const poll = async () => {
      if (stopped || !enabledRef.current) {
        timer = setTimeout(poll, 45_000);
        return;
      }
      try {
        const d = await getNotificationsForBell();
        const items = d?.items ?? [];
        for (const n of items) {
          if (seenRef.current.has(n.id)) continue;
          seenRef.current.add(n.id);
          // 只弹未读的新通知
          if (!n.read) {
            try {
              const notif = new Notification(n.title, {
                body: n.body || "",
                tag: n.id,
                icon: "/icons/icon-192.png",
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch {
              /* 通知失败不影响 */
            }
          }
        }
      } catch {
        /* 轮询失败静默 */
      }
      timer = setTimeout(poll, 45_000);
    };

    // 初始填充已见集合（避免把历史通知全部弹一遍）
    getNotificationsForBell()
      .then((d) => {
        for (const n of d?.items ?? []) seenRef.current.add(n.id);
        if (!stopped) timer = setTimeout(poll, 45_000);
      })
      .catch(() => {
        if (!stopped) timer = setTimeout(poll, 45_000);
      });

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [permission]);

  return { enabled, setEnabled: (v: boolean) => { setEnabled(v); enabledRef.current = v; try { localStorage.setItem(LS_KEY, v ? "true" : "false"); } catch { /* ignore */ } }, permission };
}
