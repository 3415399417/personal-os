// 服务端调度器：Node 进程常驻时自动执行定时任务（不依赖浏览器打开）
// 通过 Next.js instrumentation 在服务端启动时挂载。
// 设计：纯 Node 代码（不 import 任何业务模块），所有操作走 HTTP API，
//      避免 webpack 打包原生模块问题。
// 任务：
//  1. 每日 20:00 自动生成日报（存为复盘；幂等去重，每天最多一条）
//  2. 每周日 20:00 自动生成周报
//  3. 每分钟检查到期提醒 → 创建通知
// 去重说明：生成与落库都在 /api/auto-report（Review.autoKey 唯一键兜底），
//           本调度器只管"到点调用"，重复触发也不会产生第二条。

const BASE = "http://127.0.0.1:3000";

/** 调用 /api/data action（服务端 HTTP 版，与前端 lib/api.ts 同源；统一 {ok,data} 格式） */
async function callData(action: string, payload?: unknown): Promise<any> {
  const res = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
    signal: AbortSignal.timeout(30000),
  });
  const d = await res.json().catch(() => null);
  if (!d?.ok) throw new Error(d?.error ?? `callData ${action} 失败`);
  return d.data;
}

/** 到点调用自动日报/周报端点（幂等：已存在自动跳过） */
async function ensureAutoReport(period: "day" | "week"): Promise<void> {
  const label = period === "day" ? "日报" : "周报";
  try {
    const res = await fetch(`${BASE}/api/auto-report?period=${period}`, {
      headers: { "cache-control": "no-cache" },
      signal: AbortSignal.timeout(120000),
    });
    const d = await res.json();
    if (d?.created) console.log(`[scheduler] 自动${label} ✅ 已生成：${d.title}`);
    else console.log(`[scheduler] 自动${label} ${d?.skipped ? "⏭ 当天已存在，跳过" : "⚠️ 失败"}`);
  } catch (e) {
    console.log(`[scheduler] 自动${label} 调用失败: ${String(e).slice(0, 120)}`);
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

  // 每日 20:00-20:05 窗口自动日报（幂等；窗口内失败可重试）
  if (hour === 20 && minute < 6) {
    await ensureAutoReport("day");
  }

  // 每周日 20:00-20:05 自动周报（幂等）
  if (day === 0 && hour === 20 && minute < 6) {
    await ensureAutoReport("week");
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
  console.log("[scheduler] 服务端定时任务已启动（日报 20:00 / 周报 周日 20:00 / 提醒每分钟）");
  tick().catch(() => {});
  setInterval(() => {
    tick().catch(() => {});
  }, 60_000);

  // 启动补跑：服务在 20:00 之后启动且当天还没生成 → 立即补生成（端点幂等，不会重复）
  const h = new Date().getHours();
  const dow = new Date().getDay();
  if (h >= 20) {
    ensureAutoReport("day").catch(() => {});
    if (dow === 0) ensureAutoReport("week").catch(() => {});
  }
}
