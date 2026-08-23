"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import { createNote } from "@/lib/api";
import { NoteViewPrefs } from "@/components/common/NoteViewPrefs";
import type { DashboardData } from "@/types";

const NOTE_TYPES = ["笔记", "灵感", "文档", "学习", "复盘"];

/** 最近沉淀（原型 card-notes；数据来自 DB；卡片内可新建、点击查看笔记） */
export function NotesCard({
  notes,
  onChanged,
}: {
  notes: DashboardData["notes"];
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("笔记");
  const [content, setContent] = useState("");
  const [viewing, setViewing] = useState<DashboardData["notes"][number] | null>(null);

  const create = () => {
    const t = title.trim();
    if (!t || !content.trim()) return;
    createNote({ title: t, content: content.trim(), type })
      .then(() => {
        setTitle("");
        setContent("");
        setType("笔记");
        setModalOpen(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        onChanged();
      })
      .catch(() => {});
  };

  return (
    <article className="card" data-od-id="card-notes">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-notes.png" alt="" className="card-title-ico" />
          <h2 className="card-title">最近沉淀</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn-add" onClick={() => setModalOpen(true)} aria-label="新建笔记">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 1v10M1 6h10" />
            </svg>
            新建
          </button>
        </div>
      </div>
      {notes.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState icon="note" title="还没有笔记" sub="记录灵感与复盘，让经验沉淀" actionLabel="新建笔记" onAction={() => setModalOpen(true)} />
        </div>
      ) : (
        <ul className="note-list">
          {notes.slice(0, 3).map((n) => (
            <li
              className="note-item"
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => setViewing(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setViewing(n);
              }}
            >
              <img src="/art/notes-note-ico.png" alt="" className="notes-note-ico" />
              <div>
                <b>{n.title}</b>
                <em>{n.time}</em>
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* 底部：横线 + 查看全部 */}
      <div className="card-foot">
        <Link className="link-more" href="/notes" data-od-id="notes-more">
          查看全部笔记 &gt;
        </Link>
      </div>
      {/* 右下角插画：思考铅笔像素角色（今日执行同款模式：半透明置底） */}
      <img src="/art/notes-think.png" alt="" className="card-art notes-art" aria-hidden="true" />

      {/* 新建笔记弹窗 */}
      <Modal
        title="新建笔记"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={create}>保存</button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="hn-title">标题</label>
          <input id="hn-title" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="笔记标题" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="hn-type">类型</label>
          <select id="hn-type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {NOTE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="hn-content">内容（支持 Markdown）</label>
          <textarea id="hn-content" className="textarea" style={{ minHeight: 110 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder={"# 标题\n\n正文内容，支持 ## 小标题、> 引用、- 列表"} />
        </div>
      </Modal>

      {/* 点击查看笔记内容（只读 + 显示设置工具栏） */}
      <Modal
        title={viewing?.title ?? "笔记"}
        open={!!viewing}
        onClose={() => setViewing(null)}
        style={{ maxWidth: 640 }}
        foot={
          <button className="btn btn-soft" onClick={() => setViewing(null)}>关闭</button>
        }
      >
        <div className="note-view">
          <div className="note-view-head">
            <span className="note-view-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                <path d="M14 4.5V9h4" />
              </svg>
            </span>
            <span className="note-view-time">{viewing?.type} · {viewing?.time}</span>
          </div>
          <div className="note-view-body" style={{ minHeight: "33vh", maxHeight: "70vh", overflowY: "auto" }}>
            <NoteViewPrefs content={viewing?.content ?? ""} />
          </div>
        </div>
      </Modal>
    </article>
  );
}
