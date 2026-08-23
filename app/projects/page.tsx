"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { IncubateModal } from "@/components/common/IncubateModal";
import { createProject, getProjects } from "@/lib/api";
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
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("进行中");

  const load = () => getProjects().then(setProjects);

  useEffect(() => {
    load();
  }, []);

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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="progress-label">
                      <span>任务 {done}/{total}</span>
                      <b className="num">{p.progress}%</b>
                    </div>
                    <div className="progress">
                      <i style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
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
      </div>
    </AppShell>
  );
}
