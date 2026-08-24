"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/common/PageHead";
import { useEffect, useState } from "react";

interface StatsData {
  days: { date: string; label: string; done: number; notes: number }[];
  weekDone: number;
  weekNotes: number;
  activeProjects: number;
  projects: { name: string; status: string; progress: number }[];
  lifeNotes: { date: string; content: string }[];
  sense?: {
    totalArtifacts: number;
    matchedArtifacts: number;
    hitRate: number;
    pathFixes: number;
  };
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setErr(d.error || "加载失败")))
      .catch((e) => setErr(e.message));
  }, []);

  const maxDone = Math.max(1, ...(data?.days.map((d) => d.done) ?? [1]));
  const totalTasks = (data?.days ?? []).reduce((s, d) => s + d.done, 0);

  return (
    <AppShell>
      <div className="page">
        <PageHead title="统计" sub="看见你的节奏" />
        <div className="page-scroll">
          {err ? (
            <div className="panel" style={{ color: "#DC2626", fontSize: 13 }}>⚠️ {err}</div>
          ) : !data ? (
            <div className="panel" style={{ color: "var(--muted)", fontSize: 13 }}>加载中…</div>
          ) : (
            <>
              {/* 近 7 天完成曲线 */}
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">近 7 天完成</h2>
                  <span className="badge">共 {totalTasks} 项</span>
                </div>
                <div className="stats-bars">
                  {data.days.map((d) => (
                    <div className="stats-bar-col" key={d.date} title={`${d.label} 完成 ${d.done} 项`}>
                      <div className="stats-bar-track">
                        <div className="stats-bar-fill" style={{ height: `${Math.max(6, (d.done / maxDone) * 100)}%` }} />
                      </div>
                      <span className="stats-bar-num">{d.done}</span>
                      <span className="stats-bar-label">{d.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* 概览 */}
              <section className="stats-overview">
                <div className="stats-ov-card">
                  <b>{data.weekDone}</b>
                  <span>本周完成</span>
                </div>
                <div className="stats-ov-card">
                  <b>{data.weekNotes}</b>
                  <span>本周笔记</span>
                </div>
                <div className="stats-ov-card">
                  <b>{data.activeProjects}</b>
                  <span>进行中项目</span>
                </div>
              </section>

              {/* 项目进度 */}
              <section className="panel">
                <div className="panel-head">
                  <h2 className="panel-title">项目进度</h2>
                </div>
                {data.projects.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>暂无项目</div>
                ) : (
                  <ul className="stats-projects">
                    {data.projects.map((p) => (
                      <li key={p.name}>
                        <div className="stats-proj-head">
                          <b>{p.name}</b>
                          <span className="badge">{p.status === "active" ? "进行中" : p.status === "completed" ? "已完成" : p.status}</span>
                        </div>
                        <div className="progress" style={{ height: 5 }}>
                          <i style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="stats-proj-num">{p.progress}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* 进度感知（验证期出口标准） */}
              {data.sense && data.sense.totalArtifacts > 0 && (
                <section className="panel">
                  <div className="panel-head">
                    <h2 className="panel-title">进度感知</h2>
                    <span className="badge">验证期出口标准：命中率 ≥ 90%</span>
                  </div>
                  <div className="stats-sense">
                    <div className="stats-sense-main">
                      <b className={data.sense.hitRate >= 90 ? "sense-hit-pass" : "sense-hit-warn"}>{data.sense.hitRate}%</b>
                      <span>产物命中率</span>
                      <em>已匹配 {data.sense.matchedArtifacts} / {data.sense.totalArtifacts} 个产物</em>
                    </div>
                    <div className="stats-sense-sub">
                      <div className="stats-ov-card">
                        <b>{data.sense.pathFixes}</b>
                        <span>路径修正次数</span>
                      </div>
                      <div className="stats-ov-card">
                        <b>{data.sense.totalArtifacts - data.sense.matchedArtifacts}</b>
                        <span>未命中产物</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* 生活语录时间线 */}
              {data.lifeNotes.length > 0 && (
                <section className="panel">
                  <div className="panel-head">
                    <h2 className="panel-title">生活语录</h2>
                  </div>
                  <ul className="stats-timeline">
                    {data.lifeNotes.map((n) => (
                      <li key={n.date}>
                        <span className="stats-tl-date">{n.date}</span>
                        <span className="stats-tl-text">“{n.content}”</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
