"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { useCached } from "@/hooks/useCached";
import { IncubateModal } from "@/components/common/IncubateModal";
import { createProject, generateProjectArchive, generateProjectReview, getProjects, importProjects, scanProjectsDir } from "@/lib/api";
import type { Project, ProjectStatus } from "@/types";

const STATUSES: ProjectStatus[] = ["进行中", "待开始", "已完成", "暂停"];

const STATUS_TO_DB: Record<string, string> = {
  进行中: "active",
  待开始: "paused",
  已完成: "completed",
  暂停: "archived",
};

function statusBadge(status: ProjectStatus) {
  if (status === "已完成") return <span className="badge done">{status}</span>;
  if (status === "暂停") return <span className="badge warn">{status}</span>;
  return <span className="badge">{status}</span>;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [incubateOpen, setIncubateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [dirs, setDirs] = useState<{ name: string; folderPath: string; imported: boolean }[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = useState<"active" | "completed">("active");
  const [genArchive, setGenArchive] = useState(true);
  const [genReview, setGenReview] = useState(true);
  const [importing, setImporting] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("进行中");
  // 缓存秒开：切回本页直接显示旧数据再静默刷新
  const cachedProjects = useCached<Project[]>("projects:list", () => getProjects(), 30_000);
  useEffect(() => {
    if (cachedProjects.data) setProjects(cachedProjects.data);
  }, [cachedProjects.data]);

  const load = () => getProjects().then(setProjects);

  useEffect(() => {
    load();
  }, []);

  /** 打开导入弹窗：扫描 E:\我的项目 */
  const openImport = () => {
    setImportOpen(true);
    setPicked(new Set());
    setImportStatus("active");
    setGenArchive(true);
    scanProjectsDir().then(setDirs).catch(() => {});
  };

  const toggleDir = (name: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const importAll = () => {
    const targets = dirs.filter((d) => !d.imported && picked.has(d.name));
    if (targets.length === 0 || importing) return;
    setImporting(true);
    importProjects(targets.map((d) => ({ name: d.name, folderPath: d.folderPath, status: importStatus })))
      .then((created) => {
        setImportOpen(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        // 后台逐个生成项目档案 + 复盘（串行避免并发打爆 API；失败静默跳过）
        if (created.length > 0) {
          const queue = [...created];
          const next = () => {
            const p = queue.shift();
            if (!p) return;
            const step = genArchive
              ? generateProjectArchive(p.id).catch(() => {})
              : Promise.resolve();
            step
              .then(() => (genReview ? generateProjectReview(p.id).catch(() => {}) : Promise.resolve()))
              .catch(() => {})
              .finally(() => {
                window.dispatchEvent(new Event("betterlife:data-changed"));
                next();
              });
          };
          next();
        }
        return load();
      })
      .finally(() => setImporting(false));
  };

  const create = () => {
    const v = name.trim();
    if (!v) return;
    createProject({ name: v, desc: desc.trim(), status: STATUS_TO_DB[status] })
      .then(() => {
        setName("");
        setDesc("");
        setStatus("进行中");
        setModalOpen(false);
        return load();
      })
      .catch(() => {});
  };

  return (
    <AppShell>
      <div className="page">
      <PageHead title="项目" sub={`共 ${projects.length} 个项目`}>
        <button className="btn btn-soft" onClick={() => setIncubateOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
            <path d="M14 4.5V9h4" />
          </svg>
          从文档创建项目
        </button>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="12" height="12">
            <path d="M6 1v10M1 6h10" />
          </svg>
          新建项目
        </button>
        <button className="btn btn-soft" onClick={openImport}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
            <path d="M12 11v6M9.5 14.5L12 17l2.5-2.5" />
          </svg>
          导入历史项目
        </button>
      </PageHead>

      <div className="page-scroll">
        {projects.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon="project"
              title="还没有项目"
              sub="创建第一个项目，把目标变成可执行的计划"
              actionLabel="新建项目"
              onAction={() => setModalOpen(true)}
            />
          </div>
        ) : (
        <div className="card-grid">
          {projects.map((p) => {
            const done = p.tasks.filter((t) => t.done).length;
            const total = p.tasks.length;
            return (
              <Link href={`/projects/${p.id}`} className="mini-card" key={p.id} data-od-id={`project-${p.id}`}>
                <div className="mini-card-top">
                  <div className="mini-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.5V18A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z" />
                    </svg>
                  </div>
                  {statusBadge(p.status)}
                </div>
                <h3 className="mini-card-title">{p.name}</h3>
                <p className="mini-card-desc">{p.desc}</p>
                <div className="mini-card-foot">
                  {p.status === "已完成" ? (
                    <div style={{ fontSize: 11.5, color: "var(--accent-deep)", fontWeight: 600 }}>
                      ✅ 已完成 · 档案与复盘见项目页
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="progress-label">
                        <span>任务 {done}/{total}</span>
                        <b className="num">{p.progress}%</b>
                      </div>
                      <div className="progress">
                        <i style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mini-card-meta">
                  {p.stage} · {p.updatedAt}
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>

      <IncubateModal
        open={incubateOpen}
        onClose={() => setIncubateOpen(false)}
        onCreated={() => load()}
      />

      <Modal
        title="新建项目"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setModalOpen(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={create}>
              创建
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="np-name">项目名称</label>
          <input
            id="np-name"
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="例如：外贸AI系统"
            maxLength={30}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="np-desc">项目描述</label>
          <textarea
            id="np-desc"
            className="textarea"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="这个项目要做什么？"
            maxLength={120}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="np-status">状态</label>
          <select
            id="np-status"
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Modal>
      {/* 导入历史项目（E:\我的项目 已完成项目批量登记） */}
      <Modal
        title="导入历史项目"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        style={{ width: 640, maxWidth: "94vw" }}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setImportOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={importAll} disabled={importing}>
              {importing ? "导入中…" : `导入选中（${dirs.filter((d) => !d.imported && picked.has(d.name)).length}）`}
            </button>
          </>
        }
      >
        <p className="incubate-hint">
          扫描到 <b>E:\我的项目</b> 下 {dirs.length} 个目录（系统本体与测试目录已排除）。勾选要登记的已完成项目，只导入项目与文件夹路径，不拆分任务。
        </p>
        <div className="import-status-row">
          <span className="field-label">导入后状态</span>
          <div className="filter-tabs">
            <button
              type="button"
              className={`filter-tab${importStatus === "active" ? " active" : ""}`}
              onClick={() => setImportStatus("active")}
            >
              进行中
            </button>
            <button
              type="button"
              className={`filter-tab${importStatus === "completed" ? " active" : ""}`}
              onClick={() => setImportStatus("completed")}
            >
              已完成
            </button>
          </div>
          <button type="button" className="btn-add" onClick={() => setPicked(new Set(dirs.filter((d) => !d.imported).map((d) => d.name)))}>
            全选未导入
          </button>
        </div>
        <label className="incubate-asset import-gen-archive" style={{ marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={genArchive}
            onChange={(e) => setGenArchive(e.target.checked)}
          />
          <b>✨ 自动生成项目档案</b>
          <em>AI 读取 README/代码文档，总结成项目笔记（有真实依据，导入后后台生成，多个项目需几分钟）</em>
        </label>
        <label className="incubate-asset import-gen-archive" style={{ marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={genReview}
            onChange={(e) => setGenReview(e.target.checked)}
          />
          <b>✨ 自动生成项目复盘</b>
          <em>基于项目档案由 AI 提炼亮点/不足/下一步，沉淀到复盘页（需先生成档案）</em>
        </label>
        <ul className="import-dir-list">
          {dirs.length === 0 ? (
            <li className="import-dir-empty">扫描中…</li>
          ) : (
            dirs.map((d) => {
              const disabled = d.imported;
              const checked = !disabled && picked.has(d.name);
              return (
                <li key={d.name} className={disabled ? "import-dir-item disabled" : "import-dir-item"}>
                  <label
                    className={`incubate-asset${checked ? " picked" : ""}`}
                    style={disabled ? { opacity: 0.5, cursor: "default" } : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleDir(d.name)}
                    />
                    <b>{d.name}</b>
                    <em title={d.folderPath}>{d.folderPath}</em>
                    {disabled && <span className="badge done">已导入</span>}
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </Modal>
      </div>
    </AppShell>
  );
}
