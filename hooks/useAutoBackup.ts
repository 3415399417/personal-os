"use client";

import { useEffect } from "react";
import { createNotification } from "@/lib/api";

/**
 * 自动备份：每天首次打开系统时备份一次数据库（/api/backup → backup/dev-YYYYMMDD.db）。
 * localStorage 记录日期做第一道防线；服务端 /api/backup 也会按当天去重（skipped），
 * 只有真正新建备份时才发通知/弹 toast；备份 API 会自动清理 14 天前的旧备份。
 */
const LS_KEY = "personalos:backup-day";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useAutoBackup(onDone?: (file: string) => void) {
  useEffect(() => {
    const run = async () => {
      try {
        if (localStorage.getItem(LS_KEY) === todayKey()) return;
        const res = await fetch("/api/backup");
        const d = await res.json();
        if (d?.ok) {
          localStorage.setItem(LS_KEY, todayKey());
          // 服务端已按当天去重：只有真正新建备份才发通知/弹 toast，避免重复打扰
          if (!d.skipped) {
            onDone?.(d.file as string);
            createNotification({ type: "backup_done", title: "💾 今日数据已自动备份", body: d.file as string }).catch(() => {});
          }
        }
      } catch {
        /* 备份失败静默，不影响使用 */
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
