// 服务端调度器：Node 进程常驻时自动执行定时任务（不依赖浏览器打开）
// 通过 Next.js instrumentation 在服务端启动时挂载。
// 设计：纯 Node 代码（不 import 任何业务模块），所有操作走 HTTP API，
//      避免 webpack 打包原生模块问题。
// 任务：
//  1. 每日 21:00 自动生成日报（存为复盘）
//  2. 每周日 21:00 自动生成周报
//  3. 每分钟检查到期提醒 → 创建通知

const BASE = "http://127.0.0.1:3000";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekKey(): string {
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

/** 调用 /api/data action（服务端 HTTP 版，与前端 lib/api.ts 同源） */
async function callData(action: string, payload?: unknown): Promise<any> {
  const res = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
    signal: AbortSignal.timeout(30000),
  });
  return res.json();
}

/** 今天/本周是否已生成过日报/周报（查复盘记录） */
async function reportExists(period: "day" | "week"): Promise<boolean> {
  try {
    const reviews = await callData("getReviews");
    if (!Array.isArray(reviews)) return false;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    if (period === "week") since.setDate(since.getDate() - ((since.getDay() + 6) % 7));
    const kw = period === "day" ? "日报" : "周报";
    return reviews.some((r: any) => {
      const t = String(r.title ?? "");
      return t.includes(kw) && new Date(r.date ?? r.createdAt ?? 0).getTime() >= since.getTime();
    });
  } catch {
    return false;
  }
}

/** 调用日报/周报生成 API（AI 生成并存复盘） */
async function generateReport(period: "day" | "week"): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/report?period=${period}`, {
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(90000),
    });
    const d = await res.json();
    return !!d?.ok && !!d?.text;
  } catch {
    return false;
  }
}

/** 每分钟：到期提醒 → 站内通知（服务端版，浏览器关闭也生效） */
async function checkDueReminders() {
  try {
    const reminders = await callData("getReminders");
    if (!Array.isArray(reminders)) return;
    const now = Date.now();
    const due = reminders.filter((r: any) => r.status !== "done" && r.remindAt && new Date(r.remindAt).getTime() <= now);
    for (const r of due) {
      await callData("createNotification", {
        type: "reminder_due",
        title: `⏰ ${r.title}`,
        body: r.content || "提醒时间到了",
      });
      await callData("updateReminderStatus", { id: r.id, status: "done" });
    }
    if (due.length > 0) console.log(`[scheduler] 已触发 ${due.length} 条到期提醒`);
  } catch {
    /* 提醒检查失败静默 */
  }
}

/** 主调度循环：每分钟检查一次 */
async function tick() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay(); // 0=周日

  // 每日 21:00-21:05 窗口生成日报（当天未生成过）
  if (hour === 21 && minute < 6) {
    if (!(await reportExists("day"))) {
      const ok = await generateReport("day");
      console.log(`[scheduler] 自动日报: ${ok ? "✅ 已生成" : "⚠️ 失败或跳过"}`);
    }
  }

  // 每周日 21:00-21:05 生成周报
  if (day === 0 && hour === 21 && minute < 6) {
    if (!(await reportExists("week"))) {
      const ok = await generateReport("week");
      console.log(`[scheduler] 自动周报: ${ok ? "✅ 已生成" : "⚠️ 失败或跳过"}`);
    }
  }

  // 每分钟检查到期提醒
  await checkDueReminders();
}

let started = false;

/** Next.js instrumentation：服务端进程启动时调用一次 */
export function register() {
  if (started) return;
  started = true;
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // 仅 Node 运行时
  console.log("[scheduler] 服务端定时任务已启动（日报 21:00 / 周报 周日 21:00 / 提醒每分钟）");
  tick().catch(() => {});
  setInterval(() => {
    tick().catch(() => {});
  }, 60_000);
}
