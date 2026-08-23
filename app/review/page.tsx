"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/common/PageHead";
import { Modal } from "@/components/common/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { createReview, getReviews, getRecentCompletedTasks } from "@/lib/api";
import type { Review } from "@/types";

interface RecentTask {
  id: string;
  title: string;
  projectName: string;
  date: string;
}

export default function ReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportErr, setReportErr] = useState("");
  const [reportExpanded, setReportExpanded] = useState(false);
  const [viewing, setViewing] = useState<Review | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [wins, setWins] = useState("");
  const [losses, setLosses] = useState("");
  const [next, setNext] = useState("");

  useEffect(() => {
    load();
    getRecentCompletedTasks(7).then(setRecentTasks).catch(() => {});
  }, []);

  const load = () => getReviews().then(setReviews);

  const addTaskToWins = (t: RecentTask) => {
    const line = t.projectName ? `${t.title}（${t.projectName}）` : t.title;
    setWins((w) => (w ? w + "\n" + line : line));
  };

  const genReport = (period: "day" | "week") => {
    setReportLoading(true);
    setReportErr("");
    fetch(`/api/report?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "生成失败");
        setReport(d.text);
      })
      .catch((e) => setReportErr(e.message || "生成失败"))
      .finally(() => setReportLoading(false));
  };

  const copyReport = () => {
    navigator.clipboard?.writeText(report).catch(() => {});
  };

  const create = () => {
    const t = title.trim() || "每日复盘";
    if (!summary.trim()) return;
    const now = new Date();
    createReview({
      title: t,
      period: `${now.getFullYear()}年${now.getMonth() + 1}月`,
      summary: summary.trim(),
      wins: wins.split("\n").map((s) => s.trim()).filter(Boolean).join("\n"),
      losses: losses.split("\n").map((s) => s.trim()).filter(Boolean).join("\n"),
      next: next.split("\n").map((s) => s.trim()).filter(Boolean).join("\n"),
    })
      .then(() => {
        setTitle(""); setSummary(""); setWins(""); setLosses(""); setNext("");
        setModalOpen(false);
        return load();
      })
      .catch(() => {});
  };

  return (
    <AppShell>
      <div className="page">
      <PageHead title="复盘" sub="把经验沉淀为资产">
        <Link className="btn btn-soft" href="/github">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
          </svg>
          GitHub 情报
        </Link>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="12" height="12">
            <path d="M6 1v10M1 6h10" />
          </svg>
          新建复盘
        </button>
      </PageHead>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">🤖 AI 日报 / 周报</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-soft" style={{ height: 28, fontSize: 11.5, padding: "0 12px" }} onClick={() => genReport("day")} disabled={reportLoading}>
              生成日报
            </button>
            <button className="btn btn-soft" style={{ height: 28, fontSize: 11.5, padding: "0 12px" }} onClick={() => genReport("week")} disabled={reportLoading}>
              生成周报
            </button>
          </div>
        </div>
        {reportLoading ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>AI 正在汇总今日/本周数据，请稍候…</div>
        ) : reportErr ? (
          <div style={{ fontSize: 12.5, color: "#DC2626", padding: "8px 0" }}>⚠️ {reportErr}</div>
        ) : report ? (
          <div>
            <div className={`report-text${report.length > 220 && !reportExpanded ? " collapsed" : ""}`}>{report}</div>
            {report.length > 220 && (
              <button className="btn btn-soft" style={{ marginTop: 6, height: 24, fontSize: 11, padding: "0 10px" }} onClick={() => setReportExpanded((v) => !v)}>
                {reportExpanded ? "收起 ▲" : "展开全文 ▼"}
              </button>
            )}
            <button className="btn btn-soft" style={{ marginTop: 8, height: 26, fontSize: 11, padding: "0 12px" }} onClick={copyReport}>
              复制报告
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>
            一键生成今日日报或本周周报：自动汇总完成任务、笔记、复盘、学习记录，由 AI 提炼总结。
          </div>
        )}
      </div>

      <div className="page-scroll">
        {reviews.length === 0 ? (
          <div className="panel">
            <EmptyState
              icon="chart"
              title="还没有复盘记录"
              sub="定期复盘，把经验沉淀为可复用的资产"
              actionLabel="新建复盘"
              onAction={() => setModalOpen(true)}
            />
          </div>
        ) : (
        <div className="card-grid">
          {reviews.map((r) => (
            <article className="mini-card review-card" key={r.id} onClick={() => setViewing(r)}>
              <div className="mini-card-top">
                <div className="mini-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.2 12a7.8 7.8 0 0 1 13.4-5.5L20 8.6" />
                    <path d="M20 4v4.6h-4.6" />
                    <path d="M19.8 12a7.8 7.8 0 0 1-13.4 5.5L4 15.4" />
                    <path d="M4 20v-4.6h4.6" />
                  </svg>
                </div>
                <span className="badge">{r.period}</span>
              </div>
              <h3 className="mini-card-title">{r.title}</h3>
              <p className="mini-card-desc">{r.summary}</p>
              {(r.wins.length > 0 || r.losses.length > 0) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {r.wins.slice(0, 2).map((w, i) => (
                    <span key={i} style={{ fontSize: 10.5, color: "var(--accent-deep)" }}>
                      ✓ {w}
                    </span>
                  ))}
                  {r.losses.slice(0, 2).map((l, i) => (
                    <span key={i} style={{ fontSize: 10.5, color: "var(--muted)" }}>
                      · {l}
                    </span>
                  ))}
                </div>
              )}
              <div className="mini-card-foot">
                <span className="mini-card-meta">{r.date} · 点击查看详情</span>
              </div>
            </article>
          ))}
        </div>
        )}
      </div>

      <Modal
        title="复盘详情"
        open={!!viewing}
        onClose={() => setViewing(null)}
        foot={
          <>
            <button className="btn btn-soft" onClick={() => setViewing(null)}>关闭</button>
          </>
        }
      >
        {viewing && (
          <div className="review-detail">
            <div className="review-detail-head">
              <b>{viewing.title}</b>
              <span className="badge">{viewing.period}</span>
            </div>
            <div className="review-detail-date">{viewing.date}</div>
            <div className="review-detail-block">
              <div className="review-detail-label">总结</div>
              <div className="review-detail-text">{viewing.summary || "无"}</div>
            </div>
            {viewing.wins.length > 0 && (
              <div className="review-detail-block">
                <div className="review-detail-label">亮点</div>
                <ul className="review-detail-list">
                  {viewing.wins.map((w, i) => (
                    <li key={i} style={{ color: "var(--accent-deep)" }}>✓ {w}</li>
                  ))}
                </ul>
              </div>
            )}
            {viewing.losses.length > 0 && (
              <div className="review-detail-block">
                <div className="review-detail-label">不足</div>
                <ul className="review-detail-list">
                  {viewing.losses.map((l, i) => (
                    <li key={i} style={{ color: "var(--muted)" }}>· {l}</li>
                  ))}
                </ul>
              </div>
            )}
            {viewing.next.length > 0 && (
              <div className="review-detail-block">
                <div className="review-detail-label">下一步</div>
                <ul className="review-detail-list">
                  {viewing.next.map((n, i) => (
                    <li key={i}>→ {n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="新建复盘"
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
          <label className="field-label" htmlFor="rv-title">标题</label>
          <input id="rv-title" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：本周复盘：聚焦与推进" maxLength={40} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rv-summary">总结</label>
          <textarea id="rv-summary" className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="这周/今天做得怎么样？" />
        </div>
        <div className="field">
          <label className="field-label">本周完成（点击加入亮点）</label>
          {recentTasks.length === 0 ? (
            <div style={{ fontSize: 11.5, color: "var(--muted)", padding: "4px 0" }}>本周还没有完成的任务</div>
          ) : (
            <div className="review-recent">
              {recentTasks.map((t) => (
                <button
                  key={t.id}
                  className="review-recent-chip"
                  title={`${t.date}${t.projectName ? " · " + t.projectName : ""}`}
                  onClick={() => addTaskToWins(t)}
                >
                  {t.title}
                  {t.projectName ? <em>{t.projectName}</em> : null}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rv-wins">亮点（每行一条）</label>
          <textarea id="rv-wins" className="textarea" style={{ minHeight: 56 }} value={wins} onChange={(e) => setWins(e.target.value)} placeholder="完成了什么？" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rv-losses">不足（每行一条）</label>
          <textarea id="rv-losses" className="textarea" style={{ minHeight: 56 }} value={losses} onChange={(e) => setLosses(e.target.value)} placeholder="哪里可以更好？" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rv-next">下一步（每行一条）</label>
          <textarea id="rv-next" className="textarea" style={{ minHeight: 56 }} value={next} onChange={(e) => setNext(e.target.value)} placeholder="明天/下周做什么？" />
        </div>
      </Modal>
      </div>
    </AppShell>
  );
}
