"use client";

import { useEffect, useRef } from "react";
import { getReminders, updateReminderStatus } from "@/lib/api";

/**
 * 提醒浏览器通知：每分钟检查一次待提醒项，到点弹系统通知并标记 done。
 * 权限首次自动请求一次（拒绝后不再打扰）。
 */
const PERM_KEY = "personal-os-notif-perm-asked";

export function useReminderNotifications() {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 权限：granted 直接用；default 且没问过 → 问一次
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default" && !localStorage.getItem(PERM_KEY)) {
      localStorage.setItem(PERM_KEY, "1");
      Notification.requestPermission().catch(() => {});
    }
    if (Notification.permission !== "granted") return;

    let stopped = false;
    const check = async () => {
      if (stopped) return;
      try {
        const reminders = await getReminders();
        const now = Date.now();
        for (const r of reminders) {
          if (r.status === "pending" && r.remindAt) {
            const at = new Date(r.remindAt).getTime();
            // 到点（前后 60s 窗口）且本会话未通知过
            if (at <= now && now - at < 60_000 && !notifiedRef.current.has(r.id)) {
              notifiedRef.current.add(r.id);
              new Notification(r.title, { body: r.meta || "该处理了", tag: r.id });
              updateReminderStatus(r.id, "done").catch(() => {});
            }
          }
        }
      } catch {
        /* ignore */
      }
    };
    check();
    const t = setInterval(check, 60_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);
}
