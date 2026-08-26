"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createReminder, createTodo, deleteReminder, deleteTodo, getDashboard, getTodos, toggleTodo, updateReminderStatus } from "@/lib/api";
import { Modal } from "@/components/common/Modal";
import type { DashboardData, Reminder, SidebarTodo } from "@/types";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { open, onClose },
  ref,
) {
  // ── 日期 / 星期 / 问候语：从系统时间动态生成（与原型 JS 一致）──
  const [greeting, setGreeting] = useState({ date: "", week: "", title: "" });
  useEffect(() => {
    const now = new Date();
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const h = now.getHours();
    const greet =
      h < 5 ? "夜深了" : h < 11 ? "早上好" : h < 13 ? "中午好" : h < 18 ? "下午好" : "晚上好";
    setGreeting({
      date: `${now.getMonth() + 1}月${now.getDate()}日`,
      week: weekdays[now.getDay()],
      title: greet,
    });
  }, []);

  // ── 设置开关：每日问候 / 系统提醒（设置页可关）──
  const [prefs, setPrefs] = useState<{ daily: boolean; remind: boolean }>({ daily: true, remind: true });
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("personalos:settings");
        const s = raw ? JSON.parse(raw) : {};
        setPrefs({ daily: s.daily !== false, remind: s.remind !== false });
      } catch {
        setPrefs({ daily: true, remind: true });
      }
    };
    read();
    window.addEventListener("betterlife:settings-changed", read);
    return () => window.removeEventListener("betterlife:settings-changed", read);
  }, []);

  // ── 待办：数据库持久化 ──
  const [todos, setTodos] = useState<SidebarTodo[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [stats, setStats] = useState<DashboardData["stats"] | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  // ── 系统提醒：新建表单 + 到点提醒 ──
  const [addingReminder, setAddingReminder] = useState(false);
  const [rmDraft, setRmDraft] = useState("");
  const [rmDay, setRmDay] = useState<"today" | "tomorrow">("today");
  const [rmTime, setRmTime] = useState("09:00");
  const [dueReminder, setDueReminder] = useState<Reminder | null>(null);
  const firedRef = useRef(new Set<string>());

  const load = useCallback(() => {
    getTodos().then(setTodos);
    getDashboard().then((d) => {
      setStats(d.stats);
      setReminders(d.reminders);
    });
  }, []);

  useEffect(() => {
    load();
    // 全局数据变更事件：其他页面操作任务后同步侧边栏（如 /today 勾选）
    const onDataChanged = () => load();
    window.addEventListener("betterlife:data-changed", onDataChanged);
    return () => window.removeEventListener("betterlife:data-changed", onDataChanged);
  }, [load]);

  // 到点提醒轮询（每 15 秒）：remindAt 已到且未触发过 → 站内弹窗 + 浏览器通知，并标记 done
  useEffect(() => {
    const timer = setInterval(() => {
      const nowTs = Date.now();
      const due = reminders.filter(
        (r) =>
          r.status !== "done" &&
          r.remindAt &&
          !firedRef.current.has(r.id) &&
          new Date(r.remindAt).getTime() <= nowTs,
      );
      if (due.length === 0) return;
      const first = due[0];
      firedRef.current.add(first.id);
      setDueReminder(first);
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("⏰ " + first.title, {
            body: (first.dayLabel ? first.dayLabel + " " : "") + first.time,
          });
        } catch {
          /* 通知失败不影响站内弹窗 */
        }
      }
      due.forEach((r) => {
        firedRef.current.add(r.id);
      });
      // 先确保状态标记完成，再刷新列表（避免竞态导致已提醒不置灰）
      Promise.all(due.map((r) => updateReminderStatus(r.id, "done").catch(() => {}))).then(load);
    }, 15000);
    return () => clearInterval(timer);
  }, [reminders, load]);

  const saveReminder = () => {
    const v = rmDraft.trim();
    if (!v) return;
    const now = new Date();
    const [h, m] = rmTime.split(":").map(Number);
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (rmDay === "tomorrow" ? 1 : 0),
      h || 0,
      m || 0,
      0,
      0,
    );
    // 用户手势内请求通知权限
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    createReminder({ title: v, remindAt: d.toISOString() })
      .then(() => {
        setRmDraft("");
        setRmDay("today");
        setRmTime("09:00");
        setAddingReminder(false);
        return load();
      })
      .catch(() => {});
  };

  const removeReminder = (id: string) => {
    deleteReminder(id)
      .then(load)
      .catch(load);
  };

  const toggle = (id: string, done: boolean) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    // 广播数据变更：首页今日执行等卡片实时同步
    const notify = () => window.dispatchEvent(new Event("betterlife:data-changed"));
    toggleTodo(id, done)
      .then(notify)
      .catch(notify);
  };

  const commit = () => {
    const v = draft.trim();
    if (!v) return;
    createTodo(v)
      .then(() => {
        setDraft("");
        setAdding(false);
        window.dispatchEvent(new Event("betterlife:data-changed"));
      })
      .catch(() => {});
  };

  const remove = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const notify = () => window.dispatchEvent(new Event("betterlife:data-changed"));
    deleteTodo(id)
      .then(notify)
      .catch(notify);
  };

  // 待办分组：今日（新添加在上）/ 已过期（下方红色提醒）/ 已完成（沉底）
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayTodos = todos.filter((t) => !t.done && t.createdDate === todayKey);
  const overdueTodos = todos.filter((t) => !t.done && !!t.createdDate && t.createdDate < todayKey);
  const doneTodos = todos.filter((t) => t.done);
  const doneToday = todos.filter((t) => t.done && t.createdDate === todayKey).length;
  const todayTotal = todos.filter((t) => t.createdDate === todayKey).length;
  const overdueDays = (d?: string) =>
    d ? Math.max(1, Math.round((Date.now() - new Date(`${d}T00:00:00`).getTime()) / 86400000)) : 0;

  return (
    <aside ref={ref} className={`sidebar${open ? " open" : ""}`} data-od-id="sidebar">
      {/* 品牌区 */}
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3l1.6 4.6L18 9.2l-4.4 1.6L12 15.4l-1.6-4.6L6 9.2l4.4-1.6L12 3z" />
            <circle cx="18.5" cy="16.5" r="1.4" fill="currentColor" stroke="none" />
            <circle cx="5.5" cy="18" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <div className="brand-text">
          <b>BetterLife AI</b>
          <span>Personal OS</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        {/* 日期问候（设置：每日问候开关控制） */}
        {prefs.daily && (
        <section className="greet-card" data-od-id="sidebar-greeting">
          <div className="greet-text">
            <div className="greet-top">
              <span className="greet-date">{greeting.date}</span>
              <span className="greet-week">{greeting.week}</span>
            </div>
            <h3 className="greet-title">{greeting.title}</h3>
          </div>
          <div className="greet-art" aria-hidden="true">
            <svg viewBox="0 0 84 60" fill="none">
              <path d="M60 6a15 15 0 1 0 10 25 12.5 12.5 0 1 1 -10 -25z" fill="#C4B5FD" />
              <g transform="translate(12 40)">
                <ellipse cx="16" cy="12" rx="13" ry="9" fill="#fff" />
                <circle cx="16" cy="5" r="8" fill="#fff" />
                <path d="M10 1c-2-6 1-9 4-8 1 3 0 6-2 8z" fill="#A78BFA" />
                <path d="M20 1c2-6-1-9-4-8-1 3 0 6 2 8z" fill="#A78BFA" />
                <circle cx="13.4" cy="4.6" r=".9" fill="#1F2937" />
                <circle cx="18.6" cy="4.6" r=".9" fill="#1F2937" />
                <path
                  d="M14.5 8.4c1 .7 2 .7 3 0"
                  stroke="#1F2937"
                  strokeWidth=".8"
                  strokeLinecap="round"
                />
                <path d="M24 15c-2.5-2-5.5-2-8 0l-2-4 12-2z" fill="#EDE9FE" />
              </g>
              <circle cx="76" cy="16" r="1.6" fill="#A78BFA" />
              <circle cx="82" cy="10" r="1.1" fill="#C4B5FD" />
              <circle cx="70" cy="24" r="1" fill="#C4B5FD" />
            </svg>
          </div>
        </section>
        )}

        {/* 今日状态 */}
        <section className="side-card side-stats" data-od-id="sidebar-stats">
          <h2 className="side-title">今日状态</h2>
          <div className="stat-feature">
            <div className="sf-num num">{stats?.feature.value ?? 0}</div>
            <div className="sf-label">{stats?.feature.label ?? "今日最重要"}</div>
          </div>
          <div className="stat-grid">
            <div className="stat-cell">
              <b className="num">{stats?.cells[0]?.value ?? 0}</b>
              <span>必须完成</span>
            </div>
            <div className="stat-cell">
              <b className="num">{stats?.cells[1]?.value ?? 0}</b>
              <span>进行中项目</span>
            </div>
            <div className="stat-cell">
              <b className="num">{stats?.cells[2]?.value ?? 0}</b>
              <span>等待处理</span>
            </div>
            <div className="stat-cell">
              <b className="num">{stats?.cells[3]?.value ?? 0}</b>
              <span>今日完成</span>
            </div>
          </div>
        </section>

        {/* 待办事项：今日 / 已过期（红色提醒）/ 已完成 */}
        <section className="side-card side-todos" data-od-id="sidebar-todos">
          <div className="side-head">
            <h2 className="side-title">待办事项</h2>
            <button
              className="btn-add"
              onClick={() => setAdding((v) => !v)}
              aria-label="新建待办"
            >
              <svg
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M6 1v10M1 6h10" />
              </svg>
              新建
            </button>
          </div>

          {todos.length === 0 && (
            <ul className="todo-list">
              <li className="task-empty" style={{ padding: "14px 8px", textAlign: "center" }}>
                <span style={{ color: "var(--muted)", fontSize: 11 }}>暂无待办，点击「新建」添加</span>
              </li>
            </ul>
          )}

          {/* 今日：新添加的在上（后端已倒序） */}
          {todayTodos.length > 0 && (
            <div className="todo-group">
              <div className="todo-group-title">📌 今日</div>
              <ul className="todo-list">
                {todayTodos.map((todo) => (
                  <li key={todo.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      type="button"
                      className={`todo-item${todo.done ? " done" : ""}`}
                      role="checkbox"
                      aria-checked={todo.done}
                      aria-label={`${todo.done ? "取消完成：" : "标记完成："}${todo.text}`}
                      onClick={() => toggle(todo.id, !todo.done)}
                    >
                      <span className="todo-check">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      </span>
                      <span className="todo-text">{todo.text}</span>
                    </button>
                    <button
                      type="button"
                      className="task-del"
                      aria-label={`删除待办：${todo.text}`}
                      title="删除待办"
                      onClick={() => remove(todo.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 已过期：在下方，红色提醒 + 过期天数 */}
          {overdueTodos.length > 0 && (
            <div className="todo-group">
              <div className="todo-group-title overdue">🔥 已过期（{overdueTodos.length}）</div>
              <ul className="todo-list">
                {overdueTodos.map((todo) => (
                  <li key={todo.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      type="button"
                      className="todo-item overdue"
                      role="checkbox"
                      aria-checked={false}
                      aria-label={`标记完成：${todo.text}`}
                      onClick={() => toggle(todo.id, true)}
                    >
                      <span className="todo-check">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      </span>
                      <span className="todo-text">{todo.text}</span>
                      <span className="todo-overdue-tag">过期 {overdueDays(todo.createdDate)} 天</span>
                    </button>
                    <button
                      type="button"
                      className="task-del"
                      aria-label={`删除待办：${todo.text}`}
                      title="删除待办"
                      onClick={() => remove(todo.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 已完成：沉底划线 */}
          {doneTodos.length > 0 && (
            <div className="todo-group">
              <div className="todo-group-title">✅ 已完成（{doneTodos.length}）</div>
              <ul className="todo-list">
                {doneTodos.map((todo) => (
                  <li key={todo.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      type="button"
                      className="todo-item done"
                      role="checkbox"
                      aria-checked={true}
                      aria-label={`取消完成：${todo.text}`}
                      onClick={() => toggle(todo.id, false)}
                    >
                      <span className="todo-check">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12.5l4.5 4.5L19 7" />
                        </svg>
                      </span>
                      <span className="todo-text">{todo.text}</span>
                    </button>
                    <button
                      type="button"
                      className="task-del"
                      aria-label={`删除待办：${todo.text}`}
                      title="删除待办"
                      onClick={() => remove(todo.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 今日进度：今日完成率 */}
          {todayTotal > 0 && (
            <div style={{ marginTop: 8 }}>
              <div className="progress-meta" style={{ marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>今日进度</span>
                <b className="num" style={{ fontSize: 10 }}>
                  {doneToday}/{todayTotal}
                </b>
              </div>
              <div className="progress">
                <i style={{ width: `${Math.round((doneToday / todayTotal) * 100)}%` }} />
              </div>
            </div>
          )}
          <div className="todo-input-row" hidden={!adding}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              placeholder="输入待办，回车添加"
              maxLength={40}
            />
          </div>
        </section>

        {/* 系统提醒（设置：系统提醒开关控制） */}
        {prefs.remind && (
        <section className="side-card side-reminders" data-od-id="sidebar-reminders">
          <div className="side-head">
            <h2 className="side-title">系统提醒</h2>
            <button
              className="btn-add"
              onClick={() => setAddingReminder((v) => !v)}
              aria-label="新建提醒"
            >
              <svg
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M6 1v10M1 6h10" />
              </svg>
              新建
            </button>
          </div>

          {addingReminder && (
            <div className="remind-form">
              <input
                className="input"
                autoFocus
                value={rmDraft}
                onChange={(e) => setRmDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveReminder();
                  }
                  if (e.key === "Escape") {
                    setRmDraft("");
                    setAddingReminder(false);
                  }
                }}
                placeholder="提醒内容，如：给客户回电话"
                maxLength={40}
              />
              <div className="remind-row">
                <div className="remind-day-tabs">
                  <button
                    type="button"
                    className={`remind-day-tab${rmDay === "today" ? " active" : ""}`}
                    onClick={() => setRmDay("today")}
                  >
                    今天
                  </button>
                  <button
                    type="button"
                    className={`remind-day-tab${rmDay === "tomorrow" ? " active" : ""}`}
                    onClick={() => setRmDay("tomorrow")}
                  >
                    明天
                  </button>
                </div>
                <input
                  type="time"
                  className="remind-time-input"
                  value={rmTime}
                  onChange={(e) => setRmTime(e.target.value)}
                />
              </div>
              <div className="remind-actions">
                <button
                  className="btn btn-soft"
                  onClick={() => {
                    setRmDraft("");
                    setAddingReminder(false);
                  }}
                >
                  取消
                </button>
                <button className="btn btn-primary" onClick={saveReminder}>
                  保存提醒
                </button>
              </div>
            </div>
          )}

          <ul className="remind-list">
            {reminders.map((r) => (
              <li className={`remind-item${r.status === "done" ? " done" : ""}`} key={r.id}>
                <div className="remind-main">
                  <b>{r.title}</b>
                  {r.status === "done" ? (
                    <em>已提醒</em>
                  ) : (
                    r.meta && r.meta !== "提醒" && r.meta !== "系统提醒" && <em>{r.meta}</em>
                  )}
                </div>
                <span className="remind-time">
                  {r.dayLabel ? `${r.dayLabel} ${r.time}` : r.time}
                </span>
                <button
                  type="button"
                  className="task-del"
                  aria-label={`删除提醒：${r.title}`}
                  title="删除提醒"
                  onClick={() => removeReminder(r.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h16M10 4h4M8 7v13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7M9 11v5M15 11v5" />
                  </svg>
                </button>
              </li>
            ))}
            {reminders.length === 0 && (
              <li className="task-empty" style={{ padding: "12px 8px", textAlign: "center" }}>
                <span style={{ color: "var(--muted)", fontSize: 11 }}>暂无提醒，点「新建」设置一个</span>
              </li>
            )}
          </ul>
        </section>
        )}
      </div>

      {/* 到点提醒弹窗 */}
      <Modal
        title="⏰ 提醒"
        open={!!dueReminder}
        onClose={() => setDueReminder(null)}
        foot={
          <button className="btn btn-primary" onClick={() => setDueReminder(null)}>
            知道了
          </button>
        }
      >
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--fg)" }}>
          <b>{dueReminder?.title}</b>
          <span style={{ color: "var(--muted)", marginLeft: 8 }}>
            {dueReminder?.dayLabel} {dueReminder?.time}
          </span>
        </p>
      </Modal>

      {/* 底部品牌区 */}
      <div className="sidebar-foot" data-od-id="sidebar-footer">
        <p className="sf-copy">
          把生活与工作，<b>过成作品</b>
        </p>
        <div className="foot-icons">
          <Link className="icon-btn" href="/space" aria-label="个人空间" title="个人空间">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="3.6" />
              <path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2" />
            </svg>
          </Link>
          <Link className="icon-btn" href="/settings" aria-label="设置" title="设置">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19 12a7 7 0 0 0-.14-1.4l2-1.56-2-3.46-2.36.96A7 7 0 0 0 14.7 5L14.4 2.4h-4L10 5a7 7 0 0 0-1.8 1.06L5.84 5.1l-2 3.46 2 1.56A7 7 0 0 0 5 12c0 .48.05.95.14 1.4l-2 1.56 2 3.46 2.36-.96A7 7 0 0 0 9.3 19l.3 2.6h4l.3-2.6a7 7 0 0 0 1.8-1.06l2.36.96 2-3.46-2-1.56c.09-.45.14-.92.14-1.4z" />
            </svg>
          </Link>
        </div>
      </div>
    </aside>
  );
});
