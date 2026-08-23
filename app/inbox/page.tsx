"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/common/PageHead";
import { EmptyState } from "@/components/common/EmptyState";
import { createInboxItem, createNote, createTask, getInboxItems, markInboxHandled } from "@/lib/api";
import type { InboxItem } from "@/types";

const SOURCES = ["全部", "微信", "语音", "邮件", "随手记"] as const;

interface Suggest {
  type: "task" | "note" | "archive";
  title: string;
  projectId: string | null;
  projectName: string;
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<(typeof SOURCES)[number]>("全部");
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [suggests, setSuggests] = useState<Record<string, Suggest>>({});

  useEffect(() => {
    load();
  }, []);

  const load = () => getInboxItems().then(setItems);

  const markHandled = (id: string, handled: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, handled } : i)));
    markInboxHandled(id, handled).catch(() => load());
  };

  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    createInboxItem({ text: v, source: "随手记" })
      .then(() => {
        setDraft("");
        setAdding(false);
        return load();
      })
      .catch(() => {});
  };

  const askSuggest = (id: string, text: string) => {
    setSuggesting(id);
    fetch("/api/inbox-suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setSuggests((prev) => ({ ...prev, [id]: d.suggest }));
      })
      .catch(() => {})
      .finally(() => setSuggesting(null));
  };

  const applySuggest = (id: string, s: Suggest) => {
    const item = items.find((i) => i.id === id);
    const p = s.type === "task"
      ? createTask({ title: s.title, group: "must", projectId: s.projectId ?? undefined })
      : s.type === "note"
        ? createNote({ title: s.title, content: item?.text ?? "", type: "note", projectId: s.projectId ?? undefined })
        : Promise.resolve();
    p.then(() => {
      setSuggests((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      return markInboxHandled(id, true);
    })
      .then(load)
      .catch(() => {});
  };

  const shown = filter === "全部" ? items : items.filter((i) => i.source === filter);
  const unhandled = items.filter((i) => !i.handled).length;

  return (
    <AppShell>
      <div className="page">
      <PageHead title="收集箱" sub="所有想法先收进来，再决定去向">
        <span className="badge">待处理 {unhandled} 条</span>
      </PageHead>

      <div className="page-scroll">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">条目列表</h2>
            <div className="filter-tabs">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`filter-tab${filter === s ? " active" : ""}`}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {adding ? (
            <div className="field" style={{ marginBottom: 10 }}>
              <input
                className="input"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit();
                  }
                  if (e.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
                placeholder="输入内容，回车加入收集箱"
                maxLength={80}
              />
            </div>
          ) : (
            <button
              className="btn-add"
              style={{ alignSelf: "flex-start", marginBottom: 10 }}
              onClick={() => setAdding(true)}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 1v10M1 6h10" />
              </svg>
              收集一条
            </button>
          )}

          <div className="list-card">
            {shown.map((i) => (
              <div className="list-item" key={i.id}>
                <span className="todo-check" style={{ marginTop: 1 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                </span>
                <div className="list-item-main">
                  <span
                    className="list-item-title"
                    style={i.handled ? { color: "var(--muted)", textDecoration: "line-through" } : undefined}
                  >
                    {i.text}
                  </span>
                  <span className="list-item-sub">
                    {i.source} · {i.time}
                  </span>
                </div>
                {i.handled ? (
                  <span className="badge done">已处理</span>
                ) : (
                  <div className="inbox-actions">
                    {suggests[i.id] ? (
                      <div className="inbox-suggest">
                        <span className="inbox-suggest-tag">
                          AI 建议：{suggests[i.id].type === "task" ? "转为任务" : suggests[i.id].type === "note" ? "存为笔记" : "归档"}
                          {suggests[i.id].projectName ? ` → ${suggests[i.id].projectName}` : ""}
                        </span>
                        <button
                          className="btn btn-primary"
                          style={{ height: 24, fontSize: 10.5, padding: "0 10px" }}
                          onClick={() => applySuggest(i.id, suggests[i.id])}
                        >
                          采纳
                        </button>
                        <button
                          className="btn btn-soft"
                          style={{ height: 24, fontSize: 10.5, padding: "0 10px" }}
                          onClick={() =>
                            setSuggests((prev) => {
                              const n = { ...prev };
                              delete n[i.id];
                              return n;
                            })
                          }
                        >
                          不要
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn btn-soft"
                          style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                          onClick={() => askSuggest(i.id, i.text)}
                          disabled={suggesting === i.id}
                        >
                          {suggesting === i.id ? "分析中…" : "✨ AI 归类"}
                        </button>
                        <button
                          className="btn btn-soft"
                          style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                          onClick={() => applySuggest(i.id, { type: "task", title: i.text.slice(0, 30), projectId: null, projectName: "" })}
                        >
                          转为任务
                        </button>
                        <button
                          className="btn btn-soft"
                          style={{ height: 26, fontSize: 11, padding: "0 10px" }}
                          onClick={() => applySuggest(i.id, { type: "note", title: i.text.slice(0, 30), projectId: null, projectName: "" })}
                        >
                          存为笔记
                        </button>
                        <button className="btn btn-soft" style={{ height: 26, fontSize: 11, padding: "0 10px" }} onClick={() => markHandled(i.id, true)}>
                          归档
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {shown.length === 0 && (
              <div style={{ padding: "6px 0" }}>
                <EmptyState
                  icon="inbox"
                  title={filter === "全部" ? "收集箱还是空的" : "该来源下暂无条目"}
                  sub="把闪现的想法先收进来，稍后再分类处理"
                  actionLabel="收集一条"
                  onAction={() => setAdding(true)}
                />
              </div>
            )}
          </div>
        </section>
      </div>
      </div>
    </AppShell>
  );
}
