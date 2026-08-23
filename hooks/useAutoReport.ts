"use client";

import { useEffect } from "react";
import { createReview } from "@/lib/api";

/**
 * 自动推送：打开系统时检查并生成日报/周报（存为复盘草稿）。
 * - 日报：当天 21:00 后首次打开且当天未生成 → 自动生成
 * - 周报：周日 21:00 后首次打开且本周未生成 → 自动生成
 */
const LS_DAY = "person…day";
const LS_WEEK = "person…week";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekKey(): string {
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

async function gen(period: "day" | "week"): Promise<string | null> {
  const res = await fetch(`/api/report?period=${period}`);
  const d = await res.json();
  if (!d.ok || !d.text) return null;
  const now = new Date();
  const title =
    period === "day"
      ? `AI 日报 ${now.getMonth() + 1}月${now.getDate()}日`
      : `AI 周报 ${now.getMonth() + 1}月第${Math.ceil(now.getDate() / 7)}周`;
  await createReview({
    title,
    period: period === "day" ? `${now.getFullYear()}年${now.getMonth() + 1}月` : `${now.getFullYear()}年${now.getMonth() + 1}月`,
    summary: d.text,
  }).catch(() => {});
  return title;
}

export function useAutoReport(onGenerated?: (title: string) => void) {
  useEffect(() => {
    const hour = new Date().getHours();
    const run = async () => {
      try {
        // 日报：21 点后首次打开
        if (hour >= 21 && localStorage.getItem(LS_DAY) !== todayKey()) {
          const title = await gen("day");
          if (title) {
            localStorage.setItem(LS_DAY, todayKey());
            onGenerated?.(title);
          }
        }
        // 周报：周日 21 点后首次打开
        const isSunday = new Date().getDay() === 0;
        if (isSunday && hour >= 21 && localStorage.getItem(LS_WEEK) !== weekKey()) {
          const title = await gen("week");
          if (title) {
            localStorage.setItem(LS_WEEK, weekKey());
            onGenerated?.(title);
          }
        }
      } catch {
        /* ignore */
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
