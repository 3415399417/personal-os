"use client";

import { useEffect } from "react";

/**
 * GitHub 情报自动检测：打开系统时检测一次 + 页面开着时每 6 小时检测一次。
 * 由 /api/github/check 对比上次快照，发现新增写通知；前端只负责触发和 toast。
 */
const LS_KEY = "personal-os-github-checked";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useGithubAutoCheck(onNew?: (count: number) => void) {
  useEffect(() => {
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      try {
        const res = await fetch("/api/github/check");
        const d = await res.json();
        if (d?.ok && d.newCount > 0) {
          onNew?.(d.newCount as number);
          // 通知中心已写入，刷新铃铛
          window.dispatchEvent(new Event("betterlife:data-changed"));
        }
        localStorage.setItem(LS_KEY, todayKey());
      } catch {
        /* 网络失败静默，下次再试 */
      }
    };
    // 每日首次打开 + 每 6 小时
    run();
    const timer = window.setInterval(run, 6 * 3600 * 1000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
