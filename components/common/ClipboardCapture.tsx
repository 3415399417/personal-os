"use client";

import { useEffect, useRef, useState } from "react";
import { createInboxItem, createTask } from "@/lib/api";

/**
 * 剪贴板采集（桌面版）：Tauri 监听到复制内容后 emit betterlife:clipboard-copied，
 * 这里弹一个右下角小卡片："检测到复制内容，存入收件箱？"
 * 操作：存收件箱 / 存为任务 / 忽略
 */
export function ClipboardCapture() {
  const [item, setItem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const onCopy = (e: Event) => {
      const text = String((e as CustomEvent).detail ?? "").trim();
      if (!text || busyRef.current) return;
      setItem(text);
      // 15 秒无操作自动消失
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setItem(null), 15_000);
    };
    window.addEventListener("betterlife:clipboard-copied", onCopy as EventListener);
    return () => {
      window.removeEventListener("betterlife:clipboard-copied", onCopy as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = async (kind: "inbox" | "task") => {
    if (!item) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (kind === "inbox") {
        await createInboxItem({ text: item });
      } else {
        await createTask({ title: item.slice(0, 80), group: "must" });
      }
      window.dispatchEvent(new Event("betterlife:data-changed"));
      setItem(null);
    } catch {
      /* ignore */
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!item) return null;

  const preview = item.length > 120 ? item.slice(0, 120) + "…" : item;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 95,
        width: "min(360px, 90vw)",
        background: "var(--white)",
        border: "1px solid var(--accent-light)",
        borderRadius: 12,
        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>📋 检测到复制内容</span>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          lineHeight: 1.5,
          marginBottom: 10,
          maxHeight: 60,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}
      >
        {preview}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="btn btn-primary"
          style={{ height: 26, fontSize: 11.5, padding: "0 10px" }}
          disabled={busy}
          onClick={() => save("inbox")}
        >
          {busy ? "保存中…" : "存收件箱"}
        </button>
        <button
          className="btn btn-soft"
          style={{ height: 26, fontSize: 11.5, padding: "0 10px" }}
          disabled={busy}
          onClick={() => save("task")}
        >
          存为任务
        </button>
        <button
          className="btn btn-soft"
          style={{ height: 26, fontSize: 11.5, padding: "0 10px", marginLeft: "auto" }}
          onClick={() => setItem(null)}
        >
          忽略
        </button>
      </div>
    </div>
  );
}
