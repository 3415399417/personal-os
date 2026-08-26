"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/common/PageHead";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/api";

interface SpaceStats {
  tasksCompleted: number;
  tasksDoing: number;
  tasksTodo: number;
  tasksTotal: number;
  projectsActive: number;
  projectsCompleted: number;
  projectsTotal: number;
  notes: number;
  usageSeconds: number;
  usageDays: number;
}

interface SpaceToday {
  completed: number;
  seconds: number;
  streak: number;
}

interface RecentItem {
  title: string;
  body: string;
  time: string;
}

interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  max: number;
  percent: number;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h <= 0) return `${m} 分钟`;
  return `${h} 小时 ${m} 分`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function SpacePage() {
  const [profile, setProfile] = useState<{ name: string; role: string; focus: string; avatar?: string }>({
    name: "",
    role: "外贸创业者",
    focus: "外贸AI系统搭建",
  });
  const [stats, setStats] = useState<SpaceStats | null>(null);
  const [today, setToday] = useState<SpaceToday | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    // 个人资料从数据库读取（换浏览器不丢）
    getProfile()
      .then((p) => {
        setProfile({ name: p.name ?? "", role: p.role ?? "外贸创业者", focus: p.focus ?? "外贸AI系统搭建", avatar: p.avatar || undefined });
      })
      .catch(() => {});
    fetch("/api/space")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setStats(d.stats);
          setToday(d.today ?? null);
          setRecent(d.recent ?? []);
          setBadges(d.badges ?? []);
        }
      })
      .catch(() => {});
  }, []);

  const initial = (profile.name || "我").trim().charAt(0).toUpperCase();
  const statCards: { label: string; value: string; hint: string }[] = stats
    ? [
        { label: "完成任务", value: String(stats.tasksCompleted), hint: `共 ${stats.tasksTotal} 个任务` },
        { label: "进行中", value: String(stats.tasksDoing), hint: `待办 ${stats.tasksTodo}` },
        { label: "项目", value: String(stats.projectsTotal), hint: `进行中 ${stats.projectsActive} · 已完成 ${stats.projectsCompleted}` },
        { label: "笔记", value: String(stats.notes), hint: "知识沉淀" },
        { label: "累计学习", value: fmtDuration(stats.usageSeconds), hint: `${stats.usageDays} 天使用记录` },
      ]
    : [];

  return (
    <AppShell>
      <div className="page">
        <PageHead title="个人空间" sub="关于我的一切" />

        <div className="page-scroll">
          {/* 个人名片 */}
          <section className="panel">
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 0 6px" }}>
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="头像"
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)", background: "var(--surface-deep)" }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--accent-deep)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initial}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{profile.name || "未设置姓名"}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                  {profile.role} · 当前焦点：{profile.focus}
                </div>
                <a href="/settings" className="btn btn-soft" style={{ height: 28, fontSize: 12, padding: "0 12px", marginTop: 8 }}>
                  编辑资料
                </a>
              </div>
            </div>
          </section>

          {/* 今日焦点 */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">今日焦点</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--accent)",
                  padding: "12px 14px",
                  border: "1px solid var(--accent-light)",
                  borderRadius: 10,
                  background: "var(--accent-tint)",
                }}
              >
                🎯 {profile.focus || "尚未设置当前焦点"}
              </div>
              {today && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--surface-deep)" }}>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>今日完成</div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 1 }}>{today.completed} 个</div>
                  </div>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--surface-deep)" }}>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>今日学习</div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 1 }}>{fmtDuration(today.seconds)}</div>
                  </div>
                  <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--surface-deep)" }}>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>连续使用</div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginTop: 1, color: "var(--accent)" }}>🔥 {today.streak} 天</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 数据概览 */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">数据概览</h2>
            </div>
            {statCards.length === 0 ? (
              <div className="empty" style={{ padding: "16px 0" }}>
                加载中…
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 10,
                }}
              >
                {statCards.map((c) => (
                  <div
                    key={c.label}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      background: "var(--surface-deep)",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2, letterSpacing: "-0.02em" }}>{c.value}</div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{c.hint}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 成就徽章（首页只显示 6 个重点徽章，全部见详情页） */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">成就徽章</h2>
              <span className="panel-note">{badges.filter((b) => b.unlocked).length}/{badges.length} 已解锁</span>
            </div>
            {badges.length === 0 ? (
              <div className="empty" style={{ padding: "16px 0" }}>
                加载中…
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: 10,
                  }}
                >
                  {badges.slice(0, 6).map((b) => (
                    <div
                      key={b.id}
                      style={{
                        border: `1px solid ${b.unlocked ? "var(--accent-light)" : "var(--border)"}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                        background: b.unlocked ? "var(--accent-tint)" : "var(--surface-deep)",
                        opacity: b.unlocked ? 1 : 0.62,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{b.icon}</span>
                        <b style={{ fontSize: 12.5 }}>{b.name}</b>
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>{b.desc}</div>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--border)", marginTop: 8, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${b.percent}%`, background: b.unlocked ? "var(--accent)" : "var(--muted)", borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                        {b.unlocked ? "已解锁 ✓" : `${b.progress}/${b.max}`}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, textAlign: "right" }}>
                  <a className="btn btn-soft" style={{ height: 30, fontSize: 12, padding: "0 14px" }} href="/space/badges">
                    查看全部徽章 →
                  </a>
                </div>
              </>
            )}
          </section>

          {/* 最近动态 */}
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">最近动态</h2>
            </div>
            {recent.length === 0 ? (
              <div className="empty" style={{ padding: "16px 0" }}>
                暂无动态
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {recent.map((n, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "9px 0",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 12.5 }}>{n.title}</b>
                      {n.body && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.body}
                        </div>
                      )}
                    </div>
                    <em style={{ fontSize: 10.5, color: "var(--muted)", flexShrink: 0, fontStyle: "normal" }}>{fmtTime(n.time)}</em>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
