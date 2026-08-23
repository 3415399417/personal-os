"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useMemo, useState } from "react";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { createNote, deleteNote, getNotes, getProjects, updateNote } from "@/lib/api";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import { NoteViewPrefs } from "@/components/common/NoteViewPrefs";
import type { Note, Project } from "@/types";

const TYPES = ["全部", "复盘", "读书笔记", "客户分析", "灵感", "模板"] as const;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("全部");
  const [selected, setSelected] = useState<Note | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("灵感");
  const [editContent, setEditContent] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("灵感");
  const [content, setContent] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [noteProjectId, setNoteProjectId] = useState("");
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  useEffect(() => {
    load();
    getProjects().then(setProjects).catch(() => {});
  }, []);

  const load = () => getNotes().then(setNotes);

  // 分组：个人笔记（不关联项目）直接显示；项目笔记按项目合并为文件夹
  const { personalNotes, projectGroups } = useMemo(() => {
    const personal = notes.filter((n) => !n.projectId);
    const map = new Map<string, Note[]>();
    notes.forEach((n) => {
      if (n.projectId) {
        const arr = map.get(n.projectId) ?? [];
        arr.push(n);
        map.set(n.projectId, arr);
      }
    });
    const groups = [...map.entries()].map(([pid, ns]) => ({
      projectId: pid,
      projectName: projects.find((p) => p.id === pid)?.name ?? "项目",
      notes: ns,
    }));
    return { personalNotes: personal, projectGroups: groups };
  }, [notes, projects]);

  const openGroup = openFolder ? projectGroups.find((g) => g.projectId === openFolder) ?? null : null;

  const shown = filter === "全部" ? personalNotes : personalNotes.filter((n) => n.type === filter);

  const openNote = (n: Note) => {
    setSelected(n);
    setConfirmDel(false);
    setEditing(false);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditType(selected.type);
    setEditContent(selected.content);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    const t = editTitle.trim();
    if (!t || !editContent.trim()) return;
    updateNote(selected.id, { title: t, type: editType, content: editContent })
      .then(() => {
        setEditing(false);
        setSelected(null);
        setConfirmDel(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {});
  };

  const doDelete = () => {
    if (!selected) return;
    deleteNote(selected.id)
      .then(() => {
        setSelected(null);
        setConfirmDel(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => setConfirmDel(false));
  };

  const create = () => {
    const t = title.trim();
    if (!t || !content.trim()) return;
    createNote({ title: t, content: content.trim(), type, projectId: noteProjectId || undefined })
      .then(() => {
        setTitle(""); setContent(""); setType("灵感"); setNoteProjectId("");
        setModalOpen(false);
        return load();
      })
      .catch(() => {});
  };

  return (
    <AppShell>
      <div className="page">
      <PageHead title="笔记" sub={`共 ${notes.length} 篇`}>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="12" height="12">
            <path d="M6 1v10M1 6h10" />
          </svg>
          新建笔记
        </button>
      </PageHead>

      <div className="page-scroll">
        <div className="filter-tabs">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`filter-tab${filter === t ? " active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {personalNotes.length === 0 && projectGroups.length === 0 && (
          <div className="panel">
            <EmptyState
              icon="note"
              title={filter === "全部" ? "还没有笔记" : `「${filter}」下暂无笔记`}
              sub="记录想法、复盘与知识，让沉淀成为资产"
              actionLabel="新建笔记"
              onAction={() => setModalOpen(true)}
            />
          </div>
        )}
        <div className="card-grid">
          {/* 项目笔记文件夹 */}
          {projectGroups.map((g) => (
            <button
              className="mini-card proj-folder-card"
              key={g.projectId}
              style={{ textAlign: "left" }}
              onClick={() => setOpenFolder(g.projectId)}
            >
              <div className="mini-card-top">
                <div className="mini-ico folder-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
                    <path d="M3.5 10.5h17" />
                  </svg>
                </div>
                <span className="badge">{g.notes.length} 篇</span>
              </div>
              <h3 className="mini-card-title">{g.projectName}</h3>
              <div className="mini-card-desc">项目笔记文件夹 · 点击查看</div>
              <div className="mini-card-foot">
                <span className="mini-card-meta">{g.notes[0]?.time ?? ""}</span>
              </div>
            </button>
          ))}
          {/* 个人笔记 */}
          {shown.map((n) => (
            <button
              className="mini-card"
              key={n.id}
              style={{ textAlign: "left" }}
              onClick={() => openNote(n)}
            >
              <div className="mini-card-top">
                <div className="mini-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                    <path d="M14 4.5V9h4" />
                  </svg>
                </div>
                <span className="badge">{n.type}</span>
              </div>
              <h3 className="mini-card-title">{n.title}</h3>
              <div className="mini-card-desc">
                <MarkdownPreview content={n.content.slice(0, 60)} />
              </div>
              <div className="mini-card-foot">
                <span className="mini-card-meta">{n.time}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 项目笔记文件夹弹窗 */}
      <Modal
        title={`📁 ${openGroup?.projectName ?? "项目笔记"}`}
        open={!!openGroup}
        onClose={() => setOpenFolder(null)}
        foot={
          <button className="btn btn-soft" onClick={() => setOpenFolder(null)}>关闭</button>
        }
      >
        <ul className="note-list folder-note-list">
          {openGroup?.notes.map((n) => (
            <li
              className="note-item"
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => openNote(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openNote(n);
              }}
            >
              <span className="note-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                  <path d="M14 4.5V9h4" />
                </svg>
              </span>
              <div>
                <b>{n.title}</b>
                <em>{n.type} · {n.time}</em>
              </div>
            </li>
          ))}
        </ul>
      </Modal>

      {/* 笔记预览 + 编辑/删除（置顶，避免被文件夹弹窗遮挡） */}
      {selected && (
        <div className="modal-mask note-modal-top" onClick={() => setSelected(null)}>
          <div className="modal note-view-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 className="modal-title">{editing ? "编辑笔记" : selected.title}</h3>
                {!editing && (
                  <p className="field-hint" style={{ marginTop: 2 }}>
                    {selected.type} · {selected.time}
                  </p>
                )}
              </div>
              <button className="modal-close" onClick={() => (editing ? setEditing(false) : setSelected(null))} aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ minHeight: "33vh", maxHeight: "70vh", overflowY: "auto" }}>
              {editing ? (
                <>
                  <div className="field">
                    <label className="field-label" htmlFor="ne-title">标题</label>
                    <input id="ne-title" className="input" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={40} />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="ne-type">类型</label>
                    <select id="ne-type" className="select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                      {TYPES.filter((t) => t !== "全部").map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="ne-content">内容（支持 Markdown）</label>
                    <textarea
                      id="ne-content"
                      className="textarea"
                      style={{ minHeight: 160 }}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder={"# 标题\n\n正文内容，支持 ## 小标题、> 引用、- 列表"}
                    />
                  </div>
                </>
              ) : (
                <NoteViewPrefs content={selected.content} />
              )}
            </div>
            <div className="modal-foot">
              {editing ? (
                <>
                  <button className="btn btn-soft" onClick={() => setEditing(false)}>取消</button>
                  <button className="btn btn-primary" onClick={saveEdit}>保存</button>
                </>
              ) : confirmDel ? (
                <>
                  <button className="btn btn-soft" onClick={() => setConfirmDel(false)}>取消</button>
                  <button className="btn btn-primary" onClick={doDelete}>确认删除</button>
                </>
              ) : (
                <>
                  <button className="btn btn-soft" onClick={() => setSelected(null)}>关闭</button>
                  <button className="btn btn-soft" onClick={startEdit}>编辑</button>
                  <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                      <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                    </svg>
                    删除
                  </button>
                </>
              )}
            </div>
            {confirmDel && !editing && (
              <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6, marginTop: -6 }}>
                确认删除「<b>{selected.title}</b>」？此操作不可恢复。
              </p>
            )}
          </div>
        </div>
      )}

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
          <label className="field-label" htmlFor="nn-title">标题</label>
          <input id="nn-title" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="笔记标题" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="nn-type">类型</label>
          <select id="nn-type" className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.filter((t) => t !== "全部").map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="nn-project">关联项目（可选）</label>
          <select id="nn-project" className="select" value={noteProjectId} onChange={(e) => setNoteProjectId(e.target.value)}>
            <option value="">不关联</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="nn-content">内容（支持 Markdown）</label>
          <textarea
            id="nn-content"
            className="textarea"
            style={{ minHeight: 140 }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"# 标题\n\n正文内容，支持 ## 小标题、> 引用、- 列表"}
          />
        </div>
      </Modal>
      </div>
    </AppShell>
  );
}
