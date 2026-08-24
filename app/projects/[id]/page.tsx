"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHead } from "@/components/common/PageHead";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { createNote, createReview, createTask, deleteProject, deleteTask, getNotes, getProject, setProjectFocus, toggleTask, updateNote, updateProject } from "@/lib/api";
import { confirmTask, getProgressEvents, getTaskArtifactStatus, listProjectFiles, updateTaskArtifacts } from "@/lib/api";
import { clearResourceProject, getProjectResources } from "@/lib/api";
import { useProjectScan } from "@/hooks/useProjectScan";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import type { Note, ProgressEventItem, Project, Task, TaskArtifact, TaskGroup } from "@/types";

const GROUP_LABEL: Record<TaskGroup, string> = {
  must: "必须完成",
  doing: "进行中",
  waiting: "等待",
  done: "已完成",
};

/** 项目详情页标签按实时状态显示（感知引擎会改 status，组标签不随完成变化） */
const STATUS_LABEL: Record<string, string> = {
  todo: "待开始",
  doing: "进行中",
  waiting: "等待",
  completed: "已完成",
};

function statusLabel(t: Task): string {
  if (t.done || t.status === "completed") return "已完成";
  return STATUS_LABEL[t.status ?? "todo"] ?? "待开始";
}

/** 状态点颜色：todo 灰 / doing 蓝 / 待确认 黄 / 完成 绿 */
function dotClass(t: Task): string {
  if (t.done || t.status === "completed") return "dot-done";
  if (t.readyForConfirm) return "dot-ready";
  if (t.status === "doing") return "dot-doing";
  return "dot-todo";
}

function artifactsToText(arts?: TaskArtifact[]): string {
  return (arts ?? []).map((a) => `${a.type}: ${a.path ?? a.pattern ?? ""}`).join("\n");
}

function textToArtifacts(text: string): TaskArtifact[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(file|folder|glob)\s*[:：]\s*(.+)$/);
      if (!m) return null;
      const p = m[2].trim().replace(/\\/g, "/");
      const type = m[1] as TaskArtifact["type"];
      return type === "glob" ? { type, pattern: p } : { type, path: p };
    })
    .filter(Boolean) as TaskArtifact[];
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projResources, setProjResources] = useState<{ id: string; name: string; description: string; type: string; time: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [draftGroup, setDraftGroup] = useState<TaskGroup>("doing");
  const [adding, setAdding] = useState(false);
  const [confirmDelProject, setConfirmDelProject] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteType, setNoteType] = useState("笔记");
  const [noteContent, setNoteContent] = useState("");
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [editingPath, setEditingPath] = useState(false);
  const [pathDraft, setPathDraft] = useState("");
  const [pathError, setPathError] = useState("");
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("笔记");
  const [editContent, setEditContent] = useState("");
  // 进度感知：展开的任务 + 产物编辑草稿 + 完成依据时间线 + 扫描提示
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [artsDraft, setArtsDraft] = useState("");
  const [timeline, setTimeline] = useState<ProgressEventItem[]>([]);
  const [artifactStatus, setArtifactStatus] = useState<{ root: string; artifacts: { type: string; path: string; matched: boolean; mtime: number | null }[] } | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // 一键修正产物路径：文件反选弹窗
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRoot, setPickerRoot] = useState("");
  const [pickerFiles, setPickerFiles] = useState<string[]>([]);
  const [pickerFilter, setPickerFilter] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);

  // 打开页面即扫 + 60s 轮询（进度感知）
  useProjectScan(id, (r) => {
    setScanNotice(`检测到 ${r.changed.length} 个任务有进展，已自动更新`);
    window.setTimeout(() => setScanNotice(null), 6000);
  });

  // 监听全局数据变更（扫描 / 其他页面操作后刷新）
  useEffect(() => {
    const handler = () => {
      getProject(id).then((p) => {
        if (p) setProject(p);
      });
    };
    document.addEventListener("betterlife:data-changed", handler);
    return () => document.removeEventListener("betterlife:data-changed", handler);
  }, [id]);

  useEffect(() => {
    getProject(id).then(setProject);
    getNotes().then(setNotes);
    getProjectResources(id).then(setProjResources).catch(() => {});
  }, [id]);

  const relatedNotes = useMemo(
    () => notes.filter((n) => n.projectId === id).reverse(), // 正序：最早创建在上，最新追加在下
    [notes, id],
  );

  if (!project) {
    return (
      <AppShell>
        <div className="page">
        <div className="empty">项目不存在或加载中…</div>
        </div>
      </AppShell>
    );
  }

  const load = () => {
    getProject(id).then((p) => {
      if (p) setProject(p);
    });
  };

  const toggle = (tid: string) => {
    const t = project.tasks.find((x) => x.id === tid);
    if (!t) return;
    const next = !t.done;
    // 乐观更新 + 写库 + 重算进度
    setProject((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((x) => (x.id === tid ? { ...x, done: next } : x)),
          }
        : prev,
    );
    toggleTask(tid, next)
      .then(() => getProject(id))
      .then((p) => {
        if (p) setProject(p);
        window.dispatchEvent(new Event("betterlife:data-changed"));
      })
      .catch(() => {});
  };

  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    createTask({ title: v, group: draftGroup, projectId: id })
      .then(() => {
        setDraft("");
        setAdding(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getProject(id);
      })
      .then((p) => {
        if (p) setProject(p);
      })
      .catch(() => {});
  };

  const remove = (tid: string) => {
    // 乐观移除 + 写库 + 重算项目进度
    setProject((prev) => (prev ? { ...prev, tasks: prev.tasks.filter((x) => x.id !== tid) } : prev));
    deleteTask(tid)
      .then(() => {
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getProject(id);
      })
      .then((p) => {
        if (p) setProject(p);
      })
      .catch(() => {});
  };

  const completeProject = () => {
    if (!project || completing) return;
    setCompleting(true);
    Promise.all([
      updateProject(project.id, { status: "completed" }),
      fetch(`/api/project-summary?id=${project.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.summary) {
            return createReview({
              title: `${project.name} · 项目总结`,
              period: `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`,
              summary: d.summary,
            }).catch(() => {});
          }
        })
        .catch(() => {}),
    ])
      .then(() => {
        window.dispatchEvent(new Event("betterlife:data-changed"));
        load();
      })
      .finally(() => setCompleting(false));
  };

  const removeProject = () => {
    deleteProject(id)
      .then(() => {
        setConfirmDelProject(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        router.push("/projects");
      })
      .catch(() => setConfirmDelProject(false));
  };

  const commitNote = () => {
    const t = noteTitle.trim();
    if (!t || !noteContent.trim()) return;
    createNote({ title: t, content: noteContent.trim(), type: noteType, projectId: id })
      .then(() => {
        setNoteTitle("");
        setNoteContent("");
        setNoteType("笔记");
        setNoteModalOpen(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getNotes();
      })
      .then(setNotes)
      .catch(() => {});
  };

  const openNote = (n: Note) => {
    setViewingNote(n);
    setEditTitle(n.title);
    setEditType(n.type);
    setEditContent(n.content);
    setEditingNote(false);
  };

  const closeNote = () => {
    setViewingNote(null);
    setEditingNote(false);
  };

  const saveNote = () => {
    if (!viewingNote) return;
    const t = editTitle.trim();
    if (!t) return;
    updateNote(viewingNote.id, { title: t, content: editContent.trim(), type: editType })
      .then(() => {
        closeNote();
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getNotes();
      })
      .then(setNotes)
      .catch(() => {});
  };

  const startEditPath = () => {
    setPathDraft(project.folderPath ?? "");
    setPathError("");
    setEditingPath(true);
  };

  const savePath = () => {
    const v = pathDraft.trim();
    updateProject(id, { folderPath: v })
      .then((p) => {
        if (p) setProject(p);
        setEditingPath(false);
        setPathError("");
        window.dispatchEvent(new Event("betterlife:data-changed"));
      })
      .catch(() => setPathError("保存失败，请重试"));
  };

  const openFolder = () => {
    if (!project.folderPath) return;
    fetch("/api/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: project.folderPath }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setPathError(d.error);
        else setPathError("");
      })
      .catch(() => setPathError("打开失败，请检查路径"));
  };

  /* ── 进度感知交互 ── */

  const toggleExpand = (t: Task) => {
    if (expandedId === t.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(t.id);
    setArtsDraft(artifactsToText(t.artifacts));
    getProgressEvents(t.id)
      .then(setTimeline)
      .catch(() => setTimeline([]));
    getTaskArtifactStatus(t.id)
      .then(setArtifactStatus)
      .catch(() => setArtifactStatus(null));
  };

  const saveArts = (t: Task) => {
    const arts = textToArtifacts(artsDraft);
    updateTaskArtifacts(t.id, arts)
      .then(() => {
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getProject(id);
      })
      .then((p) => {
        if (p) setProject(p);
      })
      .catch(() => {});
  };

  /* 一键修正产物路径：从实际文件反选 */

  const openFilePicker = () => {
    setPickerLoading(true);
    setPickerOpen(true);
    setPickerFilter("");
    listProjectFiles(id)
      .then((d) => {
        setPickerRoot(d.root);
        setPickerFiles(d.files);
        if (!d.root) setScanNotice("项目未关联文件夹，无法列出实际文件");
      })
      .catch(() => setScanNotice("读取项目文件失败"))
      .finally(() => setPickerLoading(false));
  };

  /** 点选文件 → 追加到产物草稿（已有同路径则跳过，file 类型） */
  const pickFile = (rel: string) => {
    const line = `file: ${rel}`;
    const lines = artsDraft.split("\n").map((l) => l.trim()).filter(Boolean);
    const exists = lines.some((l) => {
      const m = l.match(/^(file|folder|glob)\s*[:：]\s*(.+)$/i);
      return m && m[2].trim().replace(/\\/g, "/").toLowerCase() === rel.toLowerCase();
    });
    if (!exists) lines.push(line);
    setArtsDraft(lines.join("\n"));
    setPickerFilter("");
    setPickerOpen(false);
  };

  const pickerFiltered = pickerFilter.trim()
    ? pickerFiles.filter((f) => f.toLowerCase().includes(pickerFilter.trim().toLowerCase()))
    : pickerFiles;

  const doConfirm = (t: Task) => {
    if (confirmingId) return;
    setConfirmingId(t.id);
    confirmTask(t.id)
      .then(() => {
        setExpandedId(null);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getProject(id);
      })
      .then((p) => {
        if (p) setProject(p);
      })
      .catch(() => setScanNotice("确认失败，请检查产物是否已就位"))
      .finally(() => setConfirmingId(null));
  };

  /** 批量确认：一次确认所有“待确认”任务 */
  const confirmAllReady = () => {
    const ready = project.tasks.filter((t) => !t.done && t.readyForConfirm);
    if (ready.length === 0 || confirmingId) return;
    setConfirmingId("__all__");
    Promise.all(ready.map((t) => confirmTask(t.id)))
      .then(() => {
        setExpandedId(null);
        setScanNotice(`已确认 ${ready.length} 个任务完成`);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getProject(id);
      })
      .then((p) => {
        if (p) setProject(p);
        window.setTimeout(() => setScanNotice(null), 4000);
      })
      .catch(() => setScanNotice("部分确认失败，请重试"))
      .finally(() => setConfirmingId(null));
  };

  const EVENT_LABEL: Record<string, string> = {
    artifact_matched: "产物更新",
    status_changed: "状态变化",
    confirmed: "确认完成",
    manual: "手动",
  };

  const RES_TYPE_LABEL: Record<string, string> = {
    domain: "领域",
    knowledge: "知识",
    command: "指令",
    template: "模板",
  };

  /** 解绑关联资产 */
  const unbindResource = (rid: string) => {
    clearResourceProject(rid)
      .then(() => {
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return getProjectResources(id);
      })
      .then(setProjResources)
      .catch(() => {});
  };

  const done = project.tasks.filter((t) => t.done).length;
  const total = project.tasks.length;
  const readyCount = project.tasks.filter((t) => !t.done && t.readyForConfirm).length;

  // 任务/笔记超过 8 条折叠，点按钮展开
  const shownTasks = project.tasks.length > 8 && !tasksExpanded ? project.tasks.slice(0, 8) : project.tasks;
  const shownNotes = relatedNotes.length > 8 && !notesExpanded ? relatedNotes.slice(0, 8) : relatedNotes;

  return (
    <AppShell>
      <div className="page">
      <PageHead
        title={project.name}
        sub={`${project.stage} · 更新于 ${project.updatedAt}`}
      >
        <button className="btn btn-danger" onClick={() => setConfirmDelProject(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
          </svg>
          删除项目
        </button>
        {project.status !== "已完成" && (
          <button className="btn btn-primary" onClick={completeProject} disabled={completing}>
            {completing ? "生成总结中…" : "🎉 标记完成"}
          </button>
        )}
        <Link href="/projects" className="btn btn-soft">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          返回项目
        </Link>
      </PageHead>

      <div className="page-scroll">
        {scanNotice && (
          <div className="scan-notice" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z" />
            </svg>
            {scanNotice}
          </div>
        )}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">项目概览</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className={`btn proj-focus-btn${project.isTodayFocus ? " on" : ""}`}
                aria-label={project.isTodayFocus ? "取消今日焦点" : "设为今日焦点"}
                title={project.isTodayFocus ? "取消今日焦点" : "设为今日焦点"}
                onClick={() => {
                  setProjectFocus(id, !project.isTodayFocus)
                    .then(() => {
                      window.dispatchEvent(new Event("betterlife:data-changed"));
                      return getProject(id);
                    })
                    .then((p) => {
                      if (p) setProject(p);
                    })
                    .catch(() => {});
                }}
              >
                <svg viewBox="0 0 24 24" fill={project.isTodayFocus ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l2.6 5.5 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.2l6-.7L12 3z" />
                </svg>
                {project.isTodayFocus ? "今日焦点" : "设为今日焦点"}
              </button>
              <span className="badge">{project.status}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>
            {project.desc}
          </p>
          <div className="progress-label">
            <span>{total === 0 ? (project.status === "已完成" ? "历史项目 · 无任务" : "暂无任务") : `整体进度 · 任务 ${done}/${total}`}</span>
            <b className="num">{project.progress}%</b>
          </div>
          <div className="progress">
            <i style={{ width: `${project.progress}%` }} />
          </div>

          {/* 项目位置：文件夹路径 + 打开/设置 */}
          <div className="proj-path-row">
            <span className="proj-path-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
              </svg>
              项目位置
            </span>
            {project.folderPath ? (
              <>
                <span className="proj-path-text" title={project.folderPath}>{project.folderPath}</span>
                <button type="button" className="btn btn-ghost proj-path-btn" onClick={openFolder}>
                  打开文件夹
                </button>
                <button type="button" className="btn-add" onClick={startEditPath}>编辑</button>
              </>
            ) : (
              <>
                <span className="proj-path-empty">未设置</span>
                <button type="button" className="btn-add" onClick={startEditPath}>设置路径</button>
              </>
            )}
          </div>
          {pathError && (
            <span className="proj-path-error">{pathError}</span>
          )}
          {editingPath && (
            <div className="proj-path-edit">
              <input
                className="input"
                autoFocus
                value={pathDraft}
                onChange={(e) => {
                  setPathDraft(e.target.value);
                  setPathError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    savePath();
                  }
                  if (e.key === "Escape") setEditingPath(false);
                }}
                placeholder="如：E:\我的项目\外贸AI系统"
                maxLength={300}
              />
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                <button className="btn btn-soft" style={{ height: 28, fontSize: 11.5, padding: "0 10px" }} onClick={() => setEditingPath(false)}>取消</button>
                <button className="btn btn-primary" style={{ height: 28, fontSize: 11.5, padding: "0 10px" }} onClick={savePath}>保存</button>
                {pathError && <span style={{ fontSize: 11, color: "#DC2626" }}>{pathError}</span>}
              </div>
            </div>
          )}
        </section>

        <section className="panel" data-od-id="project-tasks">
          <div className="panel-head">
            <h2 className="panel-title">任务列表</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {readyCount > 0 && (
                <button
                  className="btn-add task-confirm-all"
                  onClick={confirmAllReady}
                  disabled={confirmingId !== null}
                  title={`${readyCount} 个任务产物已就位，一键确认完成`}
                >
                  🟡 全部确认完成（{readyCount}）
                </button>
              )}
              <button
                className="btn-add"
                onClick={() => {
                  setAdding((v) => !v);
                  setDraft("");
                }}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 1v10M1 6h10" />
                </svg>
                新建任务
              </button>
            </div>
          </div>

          {/* 感知引导：未关联文件夹时提示开启进度感知（空项目也显示，新建项目第一步就引导） */}
          {!project.folderPath && (
            <div className="sense-guide" role="note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
              </svg>
              <span className="sense-guide-text">
                {project.tasks.length > 0
                  ? "设置项目文件夹后，系统将自动检测开发进度（任务状态点、完成依据）"
                  : "设置项目文件夹，开始使用进度感知（自动检测开发进度）"}
              </span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: 24, fontSize: 11, padding: "0 10px" }}
                onClick={startEditPath}
              >
                设置路径
              </button>
            </div>
          )}

          {adding && (
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
                placeholder="输入任务，回车添加"
                maxLength={60}
              />
              <div className="filter-tabs">
                {(Object.keys(GROUP_LABEL) as TaskGroup[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`filter-tab${draftGroup === g ? " active" : ""}`}
                    onClick={() => setDraftGroup(g)}
                  >
                    {GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="task-list">
            {shownTasks.map((t) => (
              <li key={t.id} className="task-li">
                <div className="task-li-row">
                  <div
                    className={`task-item${t.done ? " done" : ""}${expandedId === t.id ? " open" : ""}`}
                    role="button"
                    aria-expanded={expandedId === t.id}
                    tabIndex={0}
                    onClick={() => toggleExpand(t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand(t);
                      }
                    }}
                    title="点击查看产物与完成依据"
                  >
                    <button
                      type="button"
                      className="task-check"
                      role="checkbox"
                      aria-checked={t.done}
                      aria-label={`${t.done ? "取消完成：" : "标记完成："}${t.text}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(t.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    </button>
                    <span className="task-body">
                      <span className="task-text">{t.text}</span>
                      <span className="task-meta">
                        <span className="tag">{statusLabel(t)}</span>
                        {(t.artifacts?.length ?? 0) > 0 && (
                          <span
                            className={`prog-dot ${dotClass(t)}`}
                            title={t.readyForConfirm ? "预期产物已就位，待确认完成" : t.status === "doing" ? "开发中" : t.done ? "已完成" : "待开始"}
                          />
                        )}
                        {t.stalled && (
                          <span className="task-stalled" title="该任务长时间没有产物更新，可能已阻塞">
                            ⚠ {t.stalled.days}天无动静
                          </span>
                        )}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`task-expand-btn${expandedId === t.id ? " open" : ""}`}
                    aria-label="产物与完成依据"
                    title="产物与完成依据"
                    onClick={() => toggleExpand(t)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="task-del"
                    aria-label={`删除任务：${t.text}`}
                    title="删除任务"
                    onClick={() => remove(t.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                    </svg>
                  </button>
                </div>
                {expandedId === t.id && (
                  <div className="task-expand">
                    {!t.done && t.readyForConfirm && (
                      <div className="task-confirm-bar">
                        <span className="task-confirm-text">🟡 预期产物已全部就位</span>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ height: 26, fontSize: 11.5, padding: "0 12px" }}
                          onClick={() => doConfirm(t)}
                          disabled={confirmingId === t.id}
                        >
                          {confirmingId === t.id ? "确认中…" : "确认完成"}
                        </button>
                      </div>
                    )}
                    <div className="task-expand-title">预期产物（每行「类型: 路径」，file / folder / glob）</div>
                    <textarea
                      className="textarea task-expand-arts"
                      value={artsDraft}
                      onChange={(e) => setArtsDraft(e.target.value)}
                      placeholder={"file: src/api/auth.ts\nfolder: src/services/auth/\nglob: tests/**"}
                    />
                    <div className="task-expand-actions">
                      <button type="button" className="btn btn-soft" style={{ height: 24, fontSize: 11, padding: "0 10px" }} onClick={openFilePicker} title="从项目文件夹里点选真实存在的文件，替换猜错的路径">
                        📂 从实际文件反选
                      </button>
                      <button type="button" className="btn btn-soft" style={{ height: 24, fontSize: 11, padding: "0 10px" }} onClick={() => saveArts(t)}>
                        保存产物
                      </button>
                    </div>
                    {artifactStatus && artifactStatus.artifacts.length > 0 && (
                      <div className="task-art-status">
                        {artifactStatus.artifacts.some((a) => !a.matched) ? (
                          <>
                            <div className="task-expand-title">
                              ⚠ 还有 {artifactStatus.artifacts.filter((a) => !a.matched).length} 个产物未检测到
                              {!artifactStatus.root ? "（项目未关联文件夹，无法检测）" : ""}
                            </div>
                            <ul className="task-missing">
                              {artifactStatus.artifacts.filter((a) => !a.matched).map((a, i) => (
                                <li key={i}>{a.type}: {a.path}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <div className="task-expand-title task-all-matched">✓ 全部产物已检测到</div>
                        )}
                        {artifactStatus.artifacts.some((a) => a.matched) && (
                          <div className="task-matched">
                            已检测：{artifactStatus.artifacts.filter((a) => a.matched).map((a) => a.path).join("、")}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="task-expand-title">完成依据</div>
                    {timeline.length === 0 ? (
                      <div className="task-expand-empty">暂无事件——系统检测到产物文件变化后会在这里记录</div>
                    ) : (
                      <ul className="task-timeline">
                        {timeline.map((ev) => (
                          <li key={ev.id} className={`task-timeline-item ev-${ev.type}`}>
                            <span className="ev-time">{ev.time}</span>
                            <span className="ev-label">{EVENT_LABEL[ev.type] ?? ev.type}</span>
                            <span className="ev-detail">{ev.detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
            {total === 0 && (
              <li style={{ padding: "8px 0" }}>
                {project.status === "已完成" ? (
                  <EmptyState
                    icon="project"
                    title="已完成的历史项目"
                    sub="没有任务列表——项目已经做完。可以写复盘沉淀经验、关联知识/指令/模板，或继续开发时再添加任务"
                  />
                ) : (
                  <EmptyState
                    icon="task"
                    title="还没有任务"
                    sub="添加第一个任务，开始推进这个项目"
                    actionLabel="新建任务"
                    onAction={() => {
                      setAdding(true);
                      setDraft("");
                    }}
                  />
                )}
              </li>
            )}
          </ul>
          {project.tasks.length > 8 && (
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setTasksExpanded((v) => !v)}
            >
              {tasksExpanded ? "收起" : `展开全部（共 ${project.tasks.length} 条）`}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tasksExpanded ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
              </svg>
            </button>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">项目笔记</h2>
            <button
              className="btn-add"
              onClick={() => {
                setNoteTitle("");
                setNoteContent("");
                setNoteType("笔记");
                setNoteModalOpen(true);
              }}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 1v10M1 6h10" />
              </svg>
              新建笔记
            </button>
          </div>
          {relatedNotes.length === 0 ? (
            <EmptyState icon="note" title="暂无关联笔记" sub="为这个项目写一篇笔记，沉淀过程与经验" actionLabel="新建笔记" onAction={() => setNoteModalOpen(true)} />
          ) : (
            <>
              <ul className="note-list">
                {shownNotes.map((n) => (
                  <li
                    className="note-item"
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
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
              {relatedNotes.length > 8 && (
                <button
                  type="button"
                  className="collapse-toggle"
                  onClick={() => setNotesExpanded((v) => !v)}
                >
                  {notesExpanded ? "收起" : `展开全部（共 ${relatedNotes.length} 篇）`}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={notesExpanded ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
                  </svg>
                </button>
              )}
            </>
          )}
        </section>

        {/* 关联资产：项目关联的领域/知识/指令/模板（AI 记忆器官的连接点） */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">关联资产</h2>
            <Link href="/resources/domain" className="btn-add" style={{ textDecoration: "none" }}>
              去资源库添加 +
            </Link>
          </div>
          {projResources.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)", padding: "4px 0 8px", lineHeight: 1.6 }}>
              还没有关联资产——在领域/知识/指令/模板库新建条目时选择本项目，或去资源库把已有资产关联过来。
            </div>
          ) : (
            <ul className="note-list">
              {projResources.map((r) => (
                <li className="note-item" key={r.id}>
                  <span className="badge">{RES_TYPE_LABEL[r.type] ?? r.type}</span>
                  <div className="res-item-body">
                    <b>{r.name}</b>
                    {r.description && <em>{r.description.slice(0, 60)}</em>}
                    <span className="res-item-time">{r.time}</span>
                  </div>
                  <button
                    type="button"
                    className="task-del"
                    aria-label={`解除关联：${r.name}`}
                    title="解除关联"
                    onClick={() => unbindResource(r.id)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 删除项目确认（级联删除任务，不可恢复） */}
      <Modal
        title="删除项目"
        open={confirmDelProject}
        onClose={() => setConfirmDelProject(false)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setConfirmDelProject(false)}>取消</button>
            <button className="btn btn-primary" onClick={removeProject}>删除</button>
          </>
        }
      >
        <p style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.6 }}>
          确认删除项目「<b>{project.name}</b>」？其下 {project.tasks.length} 个任务将一并删除，此操作不可恢复。
        </p>
      </Modal>

      {/* 新建关联笔记 */}
      <Modal
        title="新建笔记"
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setNoteModalOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={commitNote}>保存</button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="pn-title">标题</label>
          <input id="pn-title" className="input" autoFocus value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="笔记标题" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="pn-type">类型</label>
          <select id="pn-type" className="select" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
            {["笔记", "复盘", "读书笔记", "客户分析", "灵感", "模板"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="pn-content">内容（支持 Markdown）</label>
          <textarea
            id="pn-content"
            className="textarea"
            style={{ minHeight: 140 }}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder={"# 标题\n\n正文内容，支持 ## 小标题、> 引用、- 列表"}
          />
        </div>
      </Modal>
      {/* 查看/编辑项目笔记 */}
      <Modal
        title={editingNote ? "编辑笔记" : (viewingNote?.title ?? "笔记")}
        open={!!viewingNote}
        onClose={closeNote}
        foot={
          editingNote ? (
            <>
              <button className="btn btn-soft" onClick={() => setEditingNote(false)}>取消</button>
              <button className="btn btn-primary" onClick={saveNote}>保存</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={closeNote}>关闭</button>
              <button className="btn btn-primary" onClick={() => setEditingNote(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" />
                  <path d="M13.5 6.5l3 3" />
                </svg>
                编辑
              </button>
            </>
          )
        }
      >
        {editingNote ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="vn-title">标题</label>
              <input id="vn-title" className="input" autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={40} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="vn-type">类型</label>
              <select id="vn-type" className="select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                {["笔记", "复盘", "读书笔记", "客户分析", "灵感", "模板"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="vn-content">内容（支持 Markdown）</label>
              <textarea
                id="vn-content"
                className="textarea"
                style={{ minHeight: 160 }}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="note-view">
            <div className="note-view-head">
              <span className="note-view-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                  <path d="M14 4.5V9h4" />
                </svg>
              </span>
              <span className="note-view-time">
                {viewingNote?.type} · {viewingNote?.time}
              </span>
            </div>
            <div className="note-view-body">
              <MarkdownPreview content={viewingNote?.content ?? ""} />
            </div>
          </div>
        )}
      </Modal>
      {/* 从实际文件反选：文件选择弹窗 */}
      <Modal
        title="从实际文件反选"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setPickerOpen(false)}>取消</button>
          </>
        }
      >
        {pickerLoading ? (
          <div style={{ fontSize: 12, color: "var(--muted)", padding: "16px 0" }}>正在读取项目文件…</div>
        ) : !pickerRoot ? (
          <p style={{ fontSize: 12, color: "#B45309", lineHeight: 1.6 }}>
            项目未关联文件夹，无法列出实际文件。请先在“项目概览”里设置项目位置。
          </p>
        ) : (
          <>
            <input
              className="input file-picker-search"
              autoFocus
              value={pickerFilter}
              onChange={(e) => setPickerFilter(e.target.value)}
              placeholder="搜索文件名（如 auth、readme）…"
              maxLength={60}
            />
            <div className="file-picker-root" title={pickerRoot}>{pickerRoot}</div>
            <ul className="file-picker-list">
              {pickerFiltered.length === 0 ? (
                <li className="file-picker-empty">没有匹配的文件（共 {pickerFiles.length} 个）</li>
              ) : (
                pickerFiltered.slice(0, 200).map((f) => (
                  <li key={f}>
                    <button
                      type="button"
                      className="file-picker-item"
                      title={`点击添加 file: ${f}`}
                      onClick={() => pickFile(f)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
                        <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
                        <path d="M14 4.5V9h4" />
                      </svg>
                      {f}
                    </button>
                  </li>
                ))
              )}
            </ul>
            {pickerFiles.length > 200 && (
              <div className="file-picker-note">显示前 200 条（共 {pickerFiles.length} 个文件），用搜索框过滤</div>
            )}
          </>
        )}
      </Modal>
      </div>
    </AppShell>
  );
}
