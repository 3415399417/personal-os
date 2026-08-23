"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/common/PageHead";
import { EmptyState } from "@/components/common/EmptyState";
import { getDashboard, getTodayTasks } from "@/lib/api";
import type { DashboardData, Task } from "@/types";

const QUICK_LINKS = [
  {
    label: "收集箱",
    href: "/inbox",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16l-1.5 12h-13z" />
        <path d="M4 11h5l1.5 2.5h3L15 11h5" />
      </svg>
    ),
  },
  {
    label: "今日计划",
    href: "/today",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
        <path d="M8 3v4M16 3v4M3.5 10h17" />
      </svg>
    ),
  },
  {
    label: "新建笔记",
    href: "/notes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4.5h9l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V6A1.5 1.5 0 0 1 6 4.5z" />
        <path d="M14 4.5V9h4" />
      </svg>
    ),
  },
  {
    label: "新建项目",
    href: "/projects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4l2.5 5.2 5.6.8-4.1 4 1 5.6-5-2.6-5 2.6 1-5.6-4.1-4 5.6-.8z" />
      </svg>
    ),
  },
  {
    label: "语音记录",
    href: "/notes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </svg>
    ),
  },
];

export default function WorkbenchPage() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    getDashboard().then(setDash);
    getTodayTasks().then(setTasks);
  }, []);

  const openTasks = tasks.filter((t) => !t.done && t.group !== "waiting");
  const waiting = tasks.filter((t) => t.group === "waiting" && !t.done);

  return (
    <AppShell>
      <div className="page">
      <PageHead title="工作台" sub="把想法变成行动，从这里开始">
        <span className="badge">今日待办 {openTasks.length + waiting.length} 项</span>
      </PageHead>

      <div className="page-scroll">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">快捷入口</h2>
          </div>
          <div className="quick-page">
            {QUICK_LINKS.map((q) => (
              <Link href={q.href} className="quick-item" key={q.label}>
                <span className="qi-ico">{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">今日进行中</h2>
              <Link href="/today" className="link-more">去今天</Link>
            </div>
            <ul className="todo-list">
              {openTasks.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <div className="todo-item">
                    <span className="todo-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    </span>
                    <span className="todo-text">{t.text}</span>
                  </div>
                </li>
              ))}
              {openTasks.length === 0 && (
                <li style={{ padding: "10px 0" }}>
                  <EmptyState icon="task" title="暂无进行中任务" sub="去「今天」页添加任务" actionLabel="去添加" actionHref="/today" />
                </li>
              )}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">等待处理</h2>
              <Link href="/today" className="link-more">去今天</Link>
            </div>
            <ul className="todo-list">
              {waiting.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <div className="todo-item">
                    <span className="todo-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    </span>
                    <span className="todo-text">{t.text}</span>
                  </div>
                </li>
              ))}
              {waiting.length === 0 && (
                <li style={{ padding: "10px 0" }}>
                  <EmptyState icon="task" title="暂无等待任务" sub="等待他人处理的事项会显示在这里" />
                </li>
              )}
            </ul>
          </section>
        </div>

        {dash && (
          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">今日状态</h2>
              <Link href="/today" className="link-more">详情</Link>
            </div>
            <div className="stat-grid" style={{ marginTop: 0 }}>
              {dash.stats.cells.map((c) => (
                <div className="stat-cell" key={c.label}>
                  <b className="num">{c.value}</b>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      </div>
    </AppShell>
  );
}
