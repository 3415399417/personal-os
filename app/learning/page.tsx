"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { createLearningRecord, getLearningRecords } from "@/lib/api";
import type { LearningRecord, LearningState } from "@/types";

function stateBadge(state: LearningState) {
  if (state === "已完成") return <span className="badge done">{state}</span>;
  if (state === "待开始") return <span className="badge">{state}</span>;
  return <span className="badge warn">进行中</span>;
}

export default function LearningPage() {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [filter, setFilter] = useState<"全部" | LearningState>("全部");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState("0");

  useEffect(() => {
    load();
  }, []);

  const load = () => getLearningRecords().then(setRecords);

  const create = () => {
    const t = title.trim();
    if (!t) return;
    createLearningRecord({ title: t, progress: Math.min(100, Math.max(0, Number(progress) || 0)) })
      .then(() => {
        setTitle("");
        setProgress("0");
        setModalOpen(false);
        return load();
      })
      .catch(() => {});
  };

  const shown = filter === "全部" ? records : records.filter((r) => r.state === filter);
  const totalMinutes = records.reduce((s, r) => s + r.minutes, 0);
  const doneCount = records.filter((r) => r.state === "已完成").length;
  const inProgress = records.filter((r) => r.state === "进行中").length;
  const percent =
    records.length > 0
      ? Math.round((records.reduce((s, r) => s + r.minutes, 0) / (records.length * 60)) * 100)
      : 0;

  return (
    <AppShell>
      <div className="page">
      <PageHead title="学习中心" sub="持续输入，让知识变成能力">
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="12" height="12">
            <path d="M6 1v10M1 6h10" />
          </svg>
          新建计划
        </button>
      </PageHead>

      <div className="page-scroll">
        <div className="stat-strip">
          <div className="stat-cell">
            <b className="num">{totalMinutes}</b>
            <span>累计学习（分钟）</span>
          </div>
          <div className="stat-cell">
            <b className="num">{records.length}</b>
            <span>学习计划</span>
          </div>
          <div className="stat-cell">
            <b className="num">{inProgress}</b>
            <span>进行中</span>
          </div>
          <div className="stat-cell">
            <b className="num">{doneCount}</b>
            <span>已完成</span>
          </div>
        </div>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">学习进度</h2>
            <span className="panel-note">{records.length > 0 ? `${totalMinutes} / ${records.length * 60} 分钟` : "暂无计划"}</span>
          </div>
          <div className="progress-label">
            <span>总进度</span>
            <b className="num">{percent}%</b>
          </div>
          <div className="progress">
            <i style={{ width: `${percent}%` }} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">学习记录</h2>
            <div className="filter-tabs">
              {(["全部", "进行中", "待开始", "已完成"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`filter-tab${filter === f ? " active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="list-card">
            {shown.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="list-item-main">
                  <span className="list-item-title">{r.title}</span>
                  <span className="list-item-sub">
                    {r.kind} · {r.date} · {r.minutes}/{r.targetMinutes} 分钟
                  </span>
                </div>
                {stateBadge(r.state)}
              </div>
            ))}
            {shown.length === 0 && (
              <div style={{ padding: "6px 0" }}>
                <EmptyState
                  icon="book"
                  title={filter === "全部" ? "还没有学习计划" : "该状态下暂无记录"}
                  sub="定一个计划，每天进步一点点"
                  actionLabel="新建计划"
                  onAction={() => setModalOpen(true)}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        title="新建学习计划"
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
          <label className="field-label" htmlFor="lr-title">计划名称</label>
          <input id="lr-title" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：阅读《反脆弱》30 分钟" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lr-progress">进度（0-100）</label>
          <input id="lr-progress" className="input" type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="0" />
        </div>
      </Modal>
      </div>
    </AppShell>
  );
}
