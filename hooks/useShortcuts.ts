"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/** 快捷键动作定义（id → 默认键位 → 执行行为） */
export const SHORTCUT_ACTIONS = [
  { id: "newTask", name: "新建任务", defaultKeys: "n", desc: "跳转到今天页添加任务" },
  { id: "goToday", name: "去今天页", defaultKeys: "g t", desc: "打开今日计划" },
  { id: "goProjects", name: "去项目页", defaultKeys: "g p", desc: "打开项目列表" },
  { id: "goStats", name: "去统计页", defaultKeys: "g s", desc: "打开统计看板" },
  { id: "goSettings", name: "去设置页", defaultKeys: "g ,", desc: "打开设置" },
  { id: "goSpace", name: "个人空间", defaultKeys: "g u", desc: "打开个人空间" },
  { id: "focusSearch", name: "聚焦搜索", defaultKeys: "/", desc: "光标跳到顶部搜索框" },
] as const;

export type ShortcutId = (typeof SHORTCUT_ACTIONS)[number]["id"];

export const SHORTCUTS_KEY = "personalos:shortcuts";

/** 读取用户自定义快捷键（localStorage），无则用默认 */
export function loadShortcuts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const out: Record<string, string> = {};
      for (const a of SHORTCUT_ACTIONS) out[a.id] = parsed[a.id] || a.defaultKeys;
      return out;
    }
  } catch {
    /* ignore */
  }
  const out: Record<string, string> = {};
  for (const a of SHORTCUT_ACTIONS) out[a.id] = a.defaultKeys;
  return out;
}

export function saveShortcuts(map: Record<string, string>) {
  try {
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("betterlife:shortcuts-changed"));
}

/** 键位串 → 单键数组（"g t" → ["g","t"]，"ctrl+n" → ["ctrl","n"]） */
export function keysToSeq(keys: string): string[] {
  return keys.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** 当前按键事件 → 规范化单键（修饰键 + 主键，如 "ctrl+n"） */
function eventKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  const key = e.key.toLowerCase();
  if (!["control", "meta", "alt", "shift"].includes(key) && key !== " ") parts.push(key);
  return parts.length ? parts.join("+") : "";
}

/** 用户按下的键位 → 可读键位串（用于录制显示） */
export function formatPressedKeys(e: React.KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  const key = e.key;
  if (!["Control", "Meta", "Alt", "Shift"].includes(key)) {
    parts.push(key.length === 1 ? key.toUpperCase() : key === " " ? "Space" : key);
  }
  return parts.join("+") || "";
}

/**
 * 全局快捷键：监听 keydown，命中用户配置的键位序列时执行动作。
 * - 支持 "g t" 这类多键序列（600ms 窗口内连续按下）
 * - 输入框聚焦时不触发（避免打字冲突）
 */
export function useShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  // 按键序列缓冲：{ key, time }，600ms 窗口
  const bufRef = useRef<{ key: string; time: number }[]>([]);

  useEffect(() => {
    let map = loadShortcuts();
    const onChanged = () => {
      map = loadShortcuts();
    };
    window.addEventListener("betterlife:shortcuts-changed", onChanged);

    // 预先解析每个动作的键位序列
    const actionSeqs = SHORTCUT_ACTIONS.map((a) => ({ action: a, seq: keysToSeq(map[a.id]) }));

    const handler = (e: KeyboardEvent) => {
      // 输入框内不触发（除非带修饰键，如 Ctrl+N）
      const target = e.target as HTMLElement;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing && !e.ctrlKey && !e.metaKey && !e.altKey) return;

      const key = eventKey(e);
      if (!key) return;

      const now = Date.now();
      // 追加当前键，丢弃超时键
      const buf = [...bufRef.current.filter((b) => now - b.time < 600), { key, time: now }];
      bufRef.current = buf;
      const curSeq = buf.map((b) => b.key);

      // 完整匹配：命中即执行
      for (const { action, seq } of actionSeqs) {
        if (seq.length === curSeq.length && seq.every((k, i) => k === curSeq[i])) {
          e.preventDefault();
          bufRef.current = [];
          switch (action.id) {
            case "newTask":
            case "goToday":
              router.push("/today");
              break;
            case "goProjects":
              router.push("/projects");
              break;
            case "goStats":
              router.push("/stats");
              break;
            case "goSettings":
              router.push("/settings");
              break;
            case "goSpace":
              router.push("/space");
              break;
            case "focusSearch":
              document.getElementById("globalSearch")?.focus();
              break;
          }
          return;
        }
      }

      // 非完整匹配：若当前序列是某个动作键位的前缀则保留，否则清空（保留当前键以便重新开始）
      const isPrefix = actionSeqs.some(({ seq }) => seq.length > curSeq.length && seq.slice(0, curSeq.length).every((k, i) => k === curSeq[i]));
      if (!isPrefix) {
        bufRef.current = curSeq.length > 1 ? [{ key: buf[buf.length - 1].key, time: now }] : [];
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      window.removeEventListener("betterlife:shortcuts-changed", onChanged);
    };
  }, [router, pathname]);

  return null;
}
