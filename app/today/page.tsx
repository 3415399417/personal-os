"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHead } from "@/components/common/PageHead";
import { useGreeting } from "@/hooks/useGreeting";
import { createTask, deleteTask, getCarryoverTasks, getDashboard, getPlanStats, getProjects, getTodayTasks, setProjectFocus, setTaskFocus, toggleTask } from "@/lib/api";
import type { DashboardData, Project, Task, TaskGroup } from "@/types";

const GROUPS: { key: TaskGroup; label: string }[] = [
  { key: "must", label: "必须完成" },
  { key: "doing", label: "进行中" },
  { key: "waiting", label: "等待" },
  { key: "done", label: "已完成" },
];

function GroupIcon({ group }: { group: TaskGroup }) {
  switch (group) {
    case "must":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l2.6 5.5 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.2l6-.7L12 3z" />
        </svg>
      );
    case "doing":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 3L5 13.5h5L9 21l8-10.5h-5L13 3z" />
        </svg>
      );
    case "waiting":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "done":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 12.5l2.5 2.5 4.5-5" />
        </svg>
      );
  }
}

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [addingGroup, setAddingGroup] = useState<TaskGroup | null>(null);
  const [draft, setDraft] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [focusData, setFocusData] = useState<DashboardData["focus"] | null>(null);
  const [carryover, setCarryover] = useState<{ id: string; title: string; group: string; projectName: string }[]>([]);
  const [hint, setHint] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [planStats, setPlanStats] = useState<{ createdToday: number; doneToday: number; carryover: number; total: number; rate: number } | null>(null);
  const greeting = useGreeting();
  const taskAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
    getProjects().then(setProjects);
    getCarryoverTasks(3).then(setCarryover).catch(() => {});
    getPlanStats().then(setPlanStats).catch(() => {});
    setHintLoading(true);
    fetch("/api/start-hint")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setHint(d.hint);
      })
      .catch(() => {})
      .finally(() => setHintLoading(false));
    const now = new Date();
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    setDateLabel(`${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`);
  }, []);

  const toggle = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const next = !t.done;
    // 乐观更新：只切 done，组不变（完成不移组，划线显示在原组）
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: next } : x)));
    toggleTask(id, next)
      .then(() => {
        load();
        window.dispatchEvent(new Event("betterlife:data-changed"));
      })
      .catch(() => load());
  };

  const load = () =>
    getTodayTasks().then(setTasks).then(() =>
      getDashboard().then((d) => setFocusData(d.focus)),
    );

  const remove = (id: string) => {
    // 乐观移除 + 写库 + 刷新
    setTasks((prev) => prev.filter((x) => x.id !== id));
    deleteTask(id)
      .then(() => {
        load();
        window.dispatchEvent(new Event("betterlife:data-changed"));
      })
      .catch(() => load());
  };

  const setFocus = (id: string, isFocus: boolean) => {
    setTaskFocus(id, isFocus)
      .then(() => {
        load();
        window.dispatchEvent(new Event("betterlife:data-changed"));
      })
      .catch(() => load());
  };

  const commit = () => {
    const v = draft.trim();
    if (!v || !addingGroup) return;
    createTask({ title: v, group: addingGroup })
      .then(() => {
        setDraft("");
        setAddingGroup(null);
        window.dispatchEvent(new Event("betterlife:data-changed"));
        return load();
      })
      .catch(() => {});
  };

  const total = tasks.length;
  const doneTotal = tasks.filter((t) => t.done).length;
  const totalPercent = total > 0 ? Math.round((doneTotal / total) * 100) : 0;

  const groupStats = Object.fromEntries(
    GROUPS.map((g) => {
      const items = tasks.filter((t) => t.group === g.key);
      const done = items.filter((t) => t.done).length;
      return [g.key, { total: items.length, done, percent: items.length > 0 ? Math.round((done / items.length) * 100) : 0 }];
    }),
  ) as Record<TaskGroup, { total: number; done: number; percent: number }>;

  const top3 =
    tasks
      .filter((t) => !t.done)
      .sort((a, b) => {
        const fa = a.isTodayFocus ? -1 : 0;
        const fb = b.isTodayFocus ? -1 : 0;
        if (fa !== fb) return fa - fb;
        if (a.group === "must" && b.group !== "must") return -1;
        if (b.group === "must" && a.group !== "must") return 1;
        return 0;
      })
      .slice(0, 3);

  return (
    <AppShell>
      <div className="page">
      <PageHead title="今天" sub={dateLabel}>
        <span className="badge">待办 {tasks.filter((t) => !t.done).length} 项</span>
      </PageHead>

      {/* 晨间启动卡片 */}
      <section className="panel start-card" data-od-id="start-card">
        <div className="start-head">
          <div className="start-title">
            <span className="start-greet">{greeting.title}</span>
            <span className="start-date">{greeting.date} {greeting.week}</span>
          </div>
          <button className="btn btn-primary start-btn" onClick={() => taskAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            开始今天
            <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11" aria-hidden="true">
              <path d="M7 4.5l12 7.5-12 7.5z" />
            </svg>
          </button>
        </div>
        <div className="start-grid">
          <div className="start-col">
            <div className="start-col-title">🎯 今日要事</div>
            {top3.length === 0 ? (
              <div className="start-empty">今天还没有任务，先添加一件最重要的事</div>
            ) : (
              <ul className="start-list">
                {top3.map((t) => (
                  <li key={t.id} className="start-item" onClick={() => toggle(t.id)}>
                    <span className={`start-dot${t.isTodayFocus ? " focus" : ""}`} />
                    <span className="start-item-text">{t.text}</span>
                    {t.isTodayFocus && <span className="badge">焦点</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="start-col">
            <div className="start-col-title">📌 昨日遗留</div>
            {carryover.length === 0 ? (
              <div className="start-empty">没有遗留任务，干净的开始 🎉</div>
            ) : (
              <ul className="start-list">
                {carryover.map((c) => (
                  <li key={c.id} className="start-item" onClick={() => toggle(c.id)}>
                    <span className="start-dot carry" />
                    <span className="start-item-text">{c.title}</span>
                    {c.projectName && <span className="badge">{c.projectName}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="start-col start-col-hint">
            <div className="start-col-title">💡 AI 提醒</div>
            {hintLoading ? (
              <div className="start-empty">正在思考今天的建议…</div>
            ) : hint ? (
              <div className="start-hint">“{hint}”</div>
            ) : (
              <div className="start-empty">今日无特别提醒</div>
            )}
          </div>
        </div>
      </section>

      {/* 今日总进度条 */}
      <section className="panel" data-od-id="today-total-progress" style={{ padding: "12px 14px" }} ref={taskAreaRef as any}>
        <div className="progress-label">
          <span>今日总进度</span>
          <b className="num">
            已完成 {doneTotal}/{total} · {totalPercent}%
          </b>
        </div>
        {total > 0 && (
          <div className="progress">
            <i style={{ width: `${totalPercent}%` }} />
          </div>
        )}
        {planStats && (
          <div className="plan-vs-actual">
            <span>今日新计划 <b>{planStats.createdToday}</b> 项</span>
            <span>昨日遗留 <b>{planStats.carryover}</b> 项</span>
            <span>今日已完成 <b>{planStats.doneToday}</b> 项</span>
            <span>计划完成率 <b className={planStats.rate >= 60 ? "good" : "low"}>{planStats.rate}%</b></span>
          </div>
        )}
      </section>

      {/* 今日焦点项目 */}
      {focusData?.kind === "project" && (
        <section className="panel focus-project-panel" data-od-id="today-focus-project">
          <div className="panel-head">
            <h2 className="panel-title">今日焦点项目</h2>
            <button
              type="button"
              className="btn-add"
              onClick={() => {
                if (!focusData.projectId) return;
                setProjectFocus(focusData.projectId, false)
                  .then(() => {
                    window.dispatchEvent(new Event("betterlife:data-changed"));
                    load();
                  })
                  .catch(() => {});
              }}
            >
              取消焦点
            </button>
          </div>
          <div className="focus-project-body">
            <div className="focus-project-left">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <b className="focus-project-name">{focusData.title}</b>
                <span className="tag">{focusData.status}</span>
              </div>
              <div className="progress-label" style={{ marginTop: 8 }}>
                <span>项目进度 · 任务 {focusData.done}/{focusData.total}</span>
                <b className="num">{focusData.progress}%</b>
              </div>
              <div className="progress">
                <i style={{ width: `${focusData.progress}%` }} />
              </div>
            </div>
            <div className="focus-project-right">
              <em>下一步行动</em>
              <b className="focus-project-next">{focusData.nextStep}</b>
              <Link href={focusData.focusHref ?? "/projects"} className="btn btn-primary" style={{ marginTop: 8 }}>
                进入项目
                <svg viewBox="0 0 24 24" fill="currentColor" width="11" height="11" aria-hidden="true">
                  <path d="M7 4.5l12 7.5-12 7.5z" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="task-groups">
        {GROUPS.map((g) => {
          const st = groupStats[g.key];
          return (
          <section className="task-group" key={g.key} data-od-id={`today-${g.key}`}>
            <div className="task-group-head">
              <h2 className="task-group-title">
                <GroupIcon group={g.key} />
                {g.label}
              </h2>
              <span className="task-group-count num">
                {st.done}/{st.total}
              </span>
            </div>
            {/* 小组进度条（空分组不渲染，避免空轨道被误读为满格） */}
            {st.total > 0 && (
              <div className="progress" style={{ margin: "2px 0 8px" }}>
                <i style={{ width: `${st.percent}%` }} />
              </div>
            )}
            <ul className="task-list">
              {tasks
                .filter((t) => t.group === g.key)
                .map((t) => (
                  <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      type="button"
                      className={`task-item${t.done ? " done" : ""}${t.isTodayFocus ? " focus" : ""}`}
                      role="checkbox"
                      aria-checked={t.done}
                      aria-label={`${t.done ? "取消完成：" : "标记完成："}${t.text}`}
                      onClick={() => toggle(t.id)}
                    >
                      <span className="task-check">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      </span>
                      <span className="task-body">
                        <span className="task-text">{t.text}</span>
                        {t.projectId && (
                          <span className="task-meta">
                            <span className="tag">
                              {projects.find((p) => p.id === t.projectId)?.name ?? "项目"}
                            </span>
                          </span>
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`task-focus${t.isTodayFocus ? " on" : ""}`}
                      aria-label={t.isTodayFocus ? `取消今日焦点：${t.text}` : `设为今日焦点：${t.text}`}
                      title={t.isTodayFocus ? "取消今日焦点" : "设为今日焦点"}
                      onClick={() => setFocus(t.id, !t.isTodayFocus)}
                    >
                      <svg viewBox="0 0 24 24" fill={t.isTodayFocus ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3l2.6 5.5 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.4l1.1-6L3.4 9.2l6-.7L12 3z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="task-del"
                      aria-label={`删除任务：${t.text}`}
                      title="删除任务"
                      onClick={() => remove(t.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                      </svg>
                    </button>
                  </li>
                ))}
              {st.total === 0 && (
                <li className="task-empty" style={{ padding: "14px 8px", textAlign: "center" }}>
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>暂无任务</span>
                </li>
              )}
            </ul>
            {addingGroup === g.key ? (
              <div className="field" style={{ marginTop: 8 }}>
                <input
                  className="input"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commit();
                    }
                    if (e.key === "Escape") {
                      setDraft("");
                      setAddingGroup(null);
                    }
                  }}
                  placeholder="输入任务，回车添加"
                  maxLength={50}
                />
              </div>
            ) : (
              <button
                type="button"
                className="btn-add"
                style={{ alignSelf: "flex-start", marginTop: 6 }}
                onClick={() => {
                  setAddingGroup(g.key);
                  setDraft("");
                }}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 1v10M1 6h10" />
                </svg>
                添加
              </button>
            )}
          </section>
          );
        })}
      </div>
      </div>
    </AppShell>
  );
}
