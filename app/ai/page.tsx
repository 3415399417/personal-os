"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useRef, useState } from "react";
import { PageHead } from "@/components/common/PageHead";
import { EmptyState } from "@/components/common/EmptyState";
import { getAiQuickReplies, getConversation, saveAiExchange } from "@/lib/api";
import type { ConversationMessage } from "@/types";

type AiModel = "flash" | "pro";
type AiEffort = "low" | "medium" | "high";

const MODEL_OPTIONS: { key: AiModel; label: string; note: string }[] = [
  { key: "flash", label: "Flash", note: "默认 · 快速" },
  { key: "pro", label: "Pro", note: "更强推理" },
];

const EFFORT_OPTIONS: { key: AiEffort; label: string }[] = [
  { key: "low", label: "低" },
  { key: "medium", label: "中" },
  { key: "high", label: "高" },
];

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AiPage() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [quick, setQuick] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<AiModel>("flash");
  const [effort, setEffort] = useState<AiEffort>("medium");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversation().then(setMessages);
    getAiQuickReplies().then(setQuick);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string) => {
    const v = text.trim();
    if (!v || busy) return;
    const time = nowTime();
    const userMsg: ConversationMessage = { id: `m-${Date.now()}`, role: "user", text: v, time };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setBusy(true);
    try {
      // 携带最近 12 条历史作为上下文
      const history = messages
        .slice(-11)
        .map((m) => ({ role: m.role, content: m.text }));
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: v }],
          model,
          effort,
          pathname: typeof window !== "undefined" ? window.location.pathname : "/",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error ?? `HTTP ${resp.status}`);
      }
      const reply: ConversationMessage = {
        id: `m-${Date.now() + 1}`,
        role: "assistant",
        text: data.content || "（模型未返回内容，请重试）",
        time: nowTime(),
        reasoning: data.reasoning || undefined,
      };
      // 工具执行提示：单独字段展示（小字），不重复拼进正文；持久化时含提示
      const tools: { name?: string; notice?: string }[] = data.toolResults ?? [];
      let persistedText = reply.text;
      if (tools.length > 0) {
        const toolNote = tools
          .map((t) => `✓ ${t.notice ?? "已执行"}`)
          .join("\n");
        reply.toolNote = toolNote;
        persistedText = `${toolNote}\n\n${reply.text}`;
      }
      setMessages((prev) => [...prev, reply]);
      // 持久化到 SQLite（AiConversation / AiMessage）
      saveAiExchange(v, persistedText).catch(() => {});
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now() + 1}`,
          role: "assistant",
          text: `⚠️ 调用失败：${err instanceof Error ? err.message : "未知错误"}。请检查服务端配置后重试。`,
          time: nowTime(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="page">
        <PageHead title="AI 助手" sub="随时待命，帮你把想法变成行动">
          <span className="badge">在线</span>
        </PageHead>

        {/* 模型与强度选择 */}
        <div
          style={{
            flex: "none",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div className="filter-tabs">
            {MODEL_OPTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`filter-tab${model === m.key ? " active" : ""}`}
                onClick={() => setModel(m.key)}
                title={m.note}
              >
                {m.label}
                {m.key === "flash" && <span style={{ opacity: 0.65 }}> · 默认</span>}
              </button>
            ))}
          </div>
          <div className="filter-tabs">
            <span style={{ fontSize: 10.5, color: "var(--muted)", alignSelf: "center" }}>模型强度</span>
            {EFFORT_OPTIONS.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`filter-tab${effort === e.key ? " active" : ""}`}
                onClick={() => setEffort(e.key)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-wrap" data-od-id="ai-chat">
          <div className="chat-list" ref={listRef}>
            {messages.length === 0 && !busy && (
              <div style={{ margin: "auto" }}>
                <EmptyState
                  icon="star"
                  title="开始与 AI 协作"
                  sub="整理收集箱、制定计划、总结文档、复盘工作"
                />
              </div>
            )}
            {messages.map((m) => (
              <div className={`chat-row ${m.role}`} key={m.id}>
                <span className="chat-avatar" aria-hidden="true">
                  {m.role === "assistant" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="8" width="14" height="11" rx="2.5" />
                      <path d="M9 8V6.5a3 3 0 0 1 6 0V8M12 12v3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8.5" r="3.4" />
                      <path d="M4.8 20c1.2-3.4 3.9-5 7.2-5s6 1.6 7.2 5" />
                    </svg>
                  )}
                </span>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  {m.toolNote && (
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--accent-deep)",
                        background: "var(--accent-tint)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "3px 9px",
                        marginBottom: 4,
                        alignSelf: "flex-start",
                        whiteSpace: "pre-line",
                        lineHeight: 1.5,
                      }}
                    >
                      {m.toolNote}
                    </div>
                  )}
                  <div className="chat-bubble" style={{ whiteSpace: "pre-line" }}>
                    {m.text}
                  </div>
                  {m.reasoning && (
                    <details
                      style={{
                        marginTop: 4,
                        fontSize: 10.5,
                        color: "var(--muted)",
                        maxWidth: 460,
                      }}
                    >
                      <summary style={{ cursor: "pointer" }}>思考过程</summary>
                      <div
                        style={{
                          marginTop: 4,
                          padding: "6px 9px",
                          background: "var(--accent-tint)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          lineHeight: 1.55,
                          whiteSpace: "pre-line",
                          maxHeight: 180,
                          overflowY: "auto",
                        }}
                      >
                        {m.reasoning}
                      </div>
                    </details>
                  )}
                  <span className="chat-time">{m.time}</span>
                </div>
              </div>
            ))}
            {busy && (
              <div className="chat-row assistant">
                <span className="chat-avatar" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="8" width="14" height="11" rx="2.5" />
                    <path d="M9 8V6.5a3 3 0 0 1 6 0V8M12 12v3" />
                  </svg>
                </span>
                <div className="chat-bubble">正在思考…</div>
              </div>
            )}
          </div>

          {quick.length > 0 && (
            <div className="chat-quick">
              {quick.map((q) => (
                <button key={q} type="button" className="ai-tag" onClick={() => send(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="输入你想让 AI 做的事…"
              aria-label="对话输入"
            />
            <button className="btn btn-primary" style={{ flex: "none" }} onClick={() => send(draft)}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true">
                <path d="M4 11.5l16-7.5-7.5 16-2-6.5z" />
              </svg>
              发送
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
