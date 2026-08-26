"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PageHead } from "@/components/common/PageHead";
import { useEffect, useState } from "react";

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

/** 徽章分组（按 id 前缀匹配；key 唯一，label 可重复） */
const GROUPS: { key: string; label: string; prefix: string }[] = [
  { key: "days-streak", label: "使用天数（连续）", prefix: "streak" },
  { key: "days-used", label: "使用天数（累计）", prefix: "used" },
  { key: "hours", label: "在线时长", prefix: "hour" },
  { key: "tasks", label: "任务", prefix: "task" },
  { key: "projects", label: "项目", prefix: "project" },
  { key: "notes", label: "笔记", prefix: "note" },
  { key: "reviews", label: "复盘", prefix: "review" },
  { key: "plans", label: "学习计划", prefix: "plan" },
  { key: "assets", label: "长期资产", prefix: "asset" },
  { key: "daily", label: "每日全勤", prefix: "day" },
];

/** 按 id 前缀分组，保持 API 顺序 */
function groupBadges(badges: Badge[]): { key: string; label: string; items: Badge[] }[] {
  const out: { key: string; label: string; items: Badge[] }[] = [];
  for (const g of GROUPS) {
    const items = badges.filter((b) => b.id.startsWith(g.prefix));
    if (items.length) out.push({ key: g.key, label: g.label, items });
  }
  return out;
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/space")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setBadges(d.badges ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <AppShell>
      <div className="page">
        <PageHead title="全部徽章" sub="记录你在 BetterLife 里的每一个里程碑">
          <a className="btn btn-soft" style={{ height: 30, fontSize: 12, padding: "0 14px" }} href="/space">
            ← 返回个人空间
          </a>
        </PageHead>

        <div className="page-scroll">
          {/* 总览 */}
          <section className="panel">
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--accent-tint)",
                  border: "1px solid var(--accent-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26,
                  flexShrink: 0,
                }}
              >
                🏆
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>
                  已解锁 {unlocked} / {badges.length || 26} 个徽章
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--border)", marginTop: 6, overflow: "hidden", maxWidth: 320 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${badges.length ? Math.round((unlocked / badges.length) * 100) : 0}%`,
                      background: "var(--accent)",
                      borderRadius: 3,
                      transition: "width .4s",
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  继续使用、完成任务、写笔记、做复盘，都能解锁新徽章
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <section className="panel">
              <div className="empty" style={{ padding: "20px 0" }}>
                加载中…
              </div>
            </section>
          ) : (
            groupBadges(badges).map((g) => (
              <section className="panel" key={g.key}>
                <div className="panel-head">
                  <h2 className="panel-title">{g.label}</h2>
                  <span className="panel-note">
                    {g.items.filter((b) => b.unlocked).length}/{g.items.length}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                  {g.items.map((b) => (
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
              </section>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
