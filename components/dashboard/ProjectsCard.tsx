"use client";

import { useState } from "react";
import Link from "next/link";
import { ProgressBar } from "@/components/common/ProgressBar";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/common/Modal";
import { createProject } from "@/lib/api";
import type { Project, ProjectStatus } from "@/types";

const STATUSES: ProjectStatus[] = ["进行中", "待开始", "已完成", "暂停"];

/** 当前项目（原型 card-projects；数据来自 DB；卡片内可新建/删除项目） */
export function ProjectsCard({
  projects,
  onChanged,
}: {
  projects: Project[];
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("进行中");

  const create = () => {
    const v = name.trim();
    if (!v) return;
    createProject({ name: v, desc: desc.trim(), status: status === "进行中" ? "active" : status === "暂停" ? "paused" : status === "已完成" ? "completed" : "archived" })
      .then(() => {
        setName("");
        setDesc("");
        setStatus("进行中");
        setModalOpen(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        onChanged();
      })
      .catch(() => {});
  };

  return (
    <article className="card" data-od-id="card-projects">
      <div className="card-head">
        <div className="card-title-row">
          <img src="/art/title-projects.png" alt="" className="card-title-ico" />
          <h2 className="card-title">当前项目</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn-add" onClick={() => setModalOpen(true)} aria-label="新建项目">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 1v10M1 6h10" />
            </svg>
            新建
          </button>
        </div>
      </div>
      {projects.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <EmptyState
            icon="project"
            title="还没有项目"
            sub="创建第一个项目，开始推进目标"
            actionLabel="新建项目"
            onAction={() => setModalOpen(true)}
          />
        </div>
      ) : (
        <ul className="proj-list">
          {projects.slice(0, 3).map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="proj-line" style={{ display: "flex" }}>
                <span className="proj-name">
                  <img src="/art/proj-sub.png" alt="" className="proj-sub-ico" />
                  <span className="proj-name-text">
                    <b>{p.name}</b>
                  </span>
                </span>
                <span className="num">{p.progress}%</span>
              </Link>
              <ProgressBar value={`${p.progress}%`} />
              {p.recentActivity && (
                <span className="proj-activity" title={p.recentActivity.detail}>
                  ⚡ {p.recentActivity.time} · {p.recentActivity.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* 底部：横线 + 查看全部 */}
      <div className="card-foot">
        <Link className="link-more" href="/projects" data-od-id="projects-more">
          查看全部项目 &gt;
        </Link>
      </div>
      {/* 右下角插画：笔记本打字像素角色（今日执行同款模式：半透明置底） */}
      <img src="/art/projects-code.png" alt="" className="card-art projects-art" aria-hidden="true" />

      {/* 新建项目弹窗 */}
      <Modal
        title="新建项目"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={create}>创建</button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="hp-name">项目名称</label>
          <input id="hp-name" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：外贸AI系统" maxLength={30} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="hp-desc">项目描述</label>
          <textarea id="hp-desc" className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="这个项目要做什么？" maxLength={120} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="hp-status">状态</label>
          <select id="hp-status" className="select" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Modal>

    </article>
  );
}
