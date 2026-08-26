"use client";

import { useEffect, useRef, useState } from "react";
import { createInboxItem, createTask } from "@/lib/api";

/**
 * 快速捕捉框：Ctrl+Shift+I 唤起，输入一句回车即入收件箱。
 * 前缀路由：
 *   !内容  → 直接创建任务（must 分组）
 *   #内容  → 创建笔记（标题 = 内容）
 *   其他   → 进收件箱（随手记）
 */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 全局快捷键：Ctrl+Shift+I（可被设置页快捷键覆盖？保持简单，固定此组合）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setOpen((v) => !v);
        setText("");
        setHint("");
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setText("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const submit = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      if (v.startsWith("!")) {
        // 直接建任务
        const t = v.slice(1).trim();
        await createTask({ title: t, group: "must" });
        setHint("✅ 已创建任务");
      } else if (v.startsWith("#")) {
        // 记笔记（类型：灵感）
        const title = v.slice(1).trim();
        const { createNote } = await import("@/lib/api");
        await createNote({ title, content: "", type: "灵感" });
        setHint("✅ 已创建笔记");
      } else {
        // 进收件箱
        await createInboxItem({ text: v });
        setHint("✅ 已收入收件箱");
      }
      setText("");
      window.dispatchEvent(new Event("betterlife:data-changed"));
      // 短暂显示成功提示后关闭
      setTimeout(() => {
        setOpen(false);
        setHint("");
      }, 900);
    } catch {
      setHint("❌ 保存失败");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "18vh",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: "min(560px, 92vw)",
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          padding: "14px 16px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>⚡ 快速捕捉</span>
          <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
            <b>!</b> 建任务 · <b>#</b> 记笔记 · 其他进收件箱 · Esc 关闭
          </span>
        </div>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="记一笔：想法、任务、待办…"
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontSize: 14,
            padding: "10px 12px",
            border: "1px solid var(--accent-light)",
            borderRadius: 10,
            outline: "none",
            background: "var(--surface)",
            color: "var(--fg)",
          }}
        />
        {hint && (
          <div style={{ fontSize: 11.5, color: "var(--accent)", marginTop: 8 }}>{hint}</div>
        )}
      </div>
    </div>
  );
}
