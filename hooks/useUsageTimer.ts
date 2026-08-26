"use client";

import { useEffect } from "react";

/**
 * 学习时长计时：打开 personal-os 即开始计时（每 60s 心跳上报），关闭/刷新停止。
 * 多标签页由后端按时间窗口去重；直接强杀进程按最后一次心跳结算（误差 ≤1 分钟）。
 */
export function useUsageTimer() {
  useEffect(() => {
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      fetch("/api/usage", { method: "POST", cache: "no-store" }).catch(() => {});
    };
    // 打开立即报到一次，之后每 60s 一次
    tick();
    const timer = window.setInterval(tick, 60000);
    // 关闭/刷新前最后结算一次
    const flush = () => {
      if (stopped) return;
      navigator.sendBeacon("/api/usage", "");
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", flush);
    };
  }, []);
}
