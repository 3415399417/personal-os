// 侧边栏待办 + 通知中心
import { prisma } from "@/lib/db";
import type { SidebarTodo } from "@/types";
import { formatTime, todayKey } from "./commons";
import { syncProjectProgressForTask } from "./tasks";

export async function getTodos(): Promise<SidebarTodo[]> {
  // 侧边栏待办 = 个人快速待办（不关联项目）；项目任务只在项目详情页展示，互不混杂
  // 排序：倒序（新添加的在上，前端再按 今日/过期/已完成 分组）
  const tasks = await prisma.task.findMany({
    where: { projectId: null },
    orderBy: [{ isTodayFocus: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: { id: true, title: true, status: true, createdAt: true },
  });
  const keyOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return tasks.map((t) => ({
    id: t.id,
    text: t.title,
    done: t.status === "completed",
    createdDate: keyOf(t.createdAt),
  }));
}

export async function createTodo(text: string): Promise<SidebarTodo> {
  const t = await prisma.task.create({ data: { title: text, status: "todo", group: "must" } });
  return { id: t.id, text: t.title, done: false };
}

export async function toggleTodo(id: string, done: boolean): Promise<void> {
  await prisma.task.update({
    where: { id },
    data: { status: done ? "completed" : "todo", completedAt: done ? new Date() : null },
  });
  await syncProjectProgressForTask(id);
}

export async function getNotifications() {
  const reminders = await prisma.reminder.findMany({
    where: { status: "pending" },
    orderBy: { remindAt: "asc" },
    take: 3,
  });
  return reminders.map((r) => ({
    id: r.id,
    title: r.title,
    meta: r.content || (r.remindAt ? formatTime(r.remindAt) : ""),
  }));
}

/* ── 通知中心（系统自动事件汇总） ── */

export async function createNotification(input: { type: string; title: string; body?: string }): Promise<void> {
  await prisma.notification.create({
    data: { type: input.type, title: input.title, body: input.body ?? "" },
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
}

export async function deleteNotification(id: string): Promise<void> {
  await prisma.notification.delete({ where: { id } });
}

export async function clearAllNotifications(): Promise<void> {
  await prisma.notification.deleteMany({});
}

/**
 * 铃铛数据：未读数 + 列表。
 * 列表 = 动态「待办过期」（实时算，不落库）置顶 + 静态通知（倒序 20 条）。
 */
export async function getNotificationsForBell(): Promise<{
  unreadCount: number;
  items: { id: string; type: string; title: string; body: string; time: string; read: boolean }[];
}> {
  // 动态：过期待办（今天之前创建、未完成）
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const overdue = await prisma.task.findMany({
    where: { projectId: null, status: { not: "completed" }, createdAt: { lt: todayStart } },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { title: true, createdAt: true },
  });
  const overdueItems = overdue.length
    ? [
        {
          id: "__overdue__",
          type: "todo_overdue",
          title: `🔥 ${overdue.length} 条待办已过期`,
          body: overdue.slice(0, 3).map((t) => t.title).join("、") + (overdue.length > 3 ? ` 等 ${overdue.length} 条` : ""),
          time: "待处理",
          read: false,
        },
      ]
    : [];

  const rows = await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  const items = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    time: formatTime(n.createdAt),
    read: n.read,
  }));
  const unreadCount = (await prisma.notification.count({ where: { read: false } })) + (overdue.length > 0 ? 1 : 0);
  return { unreadCount, items: [...overdueItems, ...items] };
}

/* ── 任务 ── */

