"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { createLearningRecord, deleteLearningRecord, getLearningRecords, getWeekNotes } from "@/lib/api";
import type { LearningRecord, LearningState } from "@/types";

function stateBadge(state: LearningState) {
  if (state === "已完成") return <span className="badge done">{state}</span>;
  if (state === "待开始") return <span className="badge">{state}</span>;
  return <span className="badge warn">进行中</span>;
}

/** 秒数 → 短格式：2.5h / 45m */
function fmtShort(seconds: number): string {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`;
  return `${Math.round(seconds / 60)}m`;
}

/** 秒数 → 中文：2 小时 15 分 / 45 分钟 */
function fmtCN(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 1) return "不足 1 分钟";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} 小时 ${m} 分` : `${m} 分钟`;
}

interface UsageDay {
  date: string;
  seconds: number;
}

export default function LearningPage() {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [weekNotes, setWeekNotes] = useState<{ id: string; title: string; type: string; time: string }[]>([]);
  const [usage, setUsage] = useState<{ today: number; week: number; list: UsageDay[] }>({ today: 0, week: 0, list: [] });
  const [filter, setFilter] = useState<"全部" | LearningState>("全部");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState("0");
  // 删除学习计划
  const [confirmDel, setConfirmDel] = useState<LearningRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    load();
    getWeekNotes().then(setWeekNotes).catch(() => {});
    fetch("/api/usage?days=7")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setUsage({ today: d.today, week: d.week, list: d.list });
      })
      .catch(() => {});
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

  const doDelete = () => {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    deleteLearningRecord(confirmDel.id)
      .then(() => {
        setConfirmDel(null);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {})
      .finally(() => setDeleting(false));
  };

  const shown = filter === "全部" ? records : records.filter((r) => r.state === filter);
  const doneCount = records.filter((r) => r.state === "已完成").length;
  const inProgress = records.filter((r) => r.state === "进行中").length;
  const avgProgress =
    records.length > 0 ? Math.round(records.reduce((s, r) => s + r.minutes, 0) / records.length) : 0;

  // 趋势图：7 根柱子，按最大时长归一化
  const maxSec = Math.max(1, ...usage.list.map((d) => d.seconds));
  const todayKey = new Date();
  const todayStr = `${todayKey.getFullYear()}-${String(todayKey.getMonth() + 1).padStart(2, "0")}-${String(todayKey.getDate()).padStart(2, "0")}`;

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
            <b className="num">{fmtShort(usage.today)}</b>
            <span>今日学习（打开系统即计时）</span>
          </div>
          <div className="stat-cell">
            <b className="num">{fmtShort(usage.week)}</b>
            <span>本周学习</span>
          </div>
          <div className="stat-cell">
            <b className="num">{inProgress}</b>
            <span>进行中计划</span>
          </div>
          <div className="stat-cell">
            <b className="num">{weekNotes.length}</b>
            <span>本周沉淀（笔记）</span>
          </div>
        </div>

        {/* 近 7 天学习时长趋势 */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">近 7 天学习时长</h2>
            <span className="panel-note">本周累计 {fmtCN(usage.week)}</span>
          </div>
          <div className="usage-chart">
            {usage.list.map((d) => (
              <div className={`usage-bar-col${d.date === todayStr ? " today" : ""}`} key={d.date} title={`${d.date} ${fmtCN(d.seconds)}`}>
                <div className="usage-bar" style={{ height: `${Math.max(4, Math.round((d.seconds / maxSec) * 100))}%` }}>
                  {d.seconds > 0 && <span className="usage-bar-val">{fmtShort(d.seconds)}</span>}
                </div>
                <span className="usage-bar-label">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 学习计划：真实进度 % */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">学习计划</h2>
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

          {records.length > 0 && (
            <div className="progress-label" style={{ marginBottom: 6 }}>
              <span>全部计划平均进度</span>
              <b className="num">{avgProgress}%</b>
            </div>
          )}

          <div className="list-card">
            {shown.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="list-item-main">
                  <span className="list-item-title">{r.title}</span>
                  <span className="list-item-sub">
                    {r.kind} · {r.date} · 进度 {r.minutes}%
                  </span>
                  <div className="progress" style={{ marginTop: 4, maxWidth: 220 }}>
                    <i style={{ width: `${r.minutes}%` }} />
                  </div>
                </div>
                {stateBadge(r.state)}
                <button
                  type="button"
                  className="task-del"
                  aria-label={`删除计划：${r.title}`}
                  title="删除计划"
                  onClick={() => setConfirmDel(r)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                  </svg>
                </button>
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

        {/* 本周沉淀：新增笔记 */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">本周沉淀</h2>
            <Link href="/notes" className="btn-add" style={{ textDecoration: "none" }}>
              去笔记页 +
            </Link>
          </div>
          {weekNotes.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>
              本周还没有新增笔记——学到的记下来，才能沉淀成自己的。
            </div>
          ) : (
            <ul className="note-list">
              {weekNotes.map((n) => (
                <li className="note-item" key={n.id}>
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
          )}
        </section>

        {/* 长期资产入口 */}
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">长期资产</h2>
            <Link href="/assets" className="btn-add" style={{ textDecoration: "none" }}>
              去资产库 +
            </Link>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0", lineHeight: 1.6 }}>
            SOP / Prompt / Skill —— 把学到的沉淀成可复用的方法，下次直接调用。
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
          <input id="lr-title" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：读完《反脆弱》" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lr-progress">当前进度（0-100%）</label>
          <input id="lr-progress" className="input" type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="0" />
        </div>
      </Modal>
      <Modal
        title="删除学习计划"
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setConfirmDel(null)}>取消</button>
            <button className="btn btn-danger" onClick={doDelete} disabled={deleting}>
              {deleting ? "删除中…" : "删除"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.6 }}>
          确认删除学习计划「<b>{confirmDel?.title}</b>」？此操作不可恢复。
        </p>
      </Modal>
      </div>
    </AppShell>
  );
}
