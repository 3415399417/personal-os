// 服务端 DB 操作层（Prisma + SQLite）：被 /api/data 与 /api/chat 工具调用共享。
// 组件层不要直接 import 本文件（它只在服务端运行）。
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { artifactMatches, fileMtimeMs, normalizeRel, walkProject } from "@/lib/artifact-matcher";
import type { Artifact } from "@/lib/artifact-matcher";
import type {
  Asset,
  ConversationMessage,
  DashboardData,
  InboxItem,
  LearningRecord,
  Note,
  Project,
  Reminder,
  Review,
  SidebarTodo,
  Task,
  TaskGroup,
} from "@/types";

/* ── 工具 ── */

const GROUP_TO_STATUS: Record<TaskGroup, string> = {
  must: "todo",
  doing: "doing",
  waiting: "waiting",
  done: "completed",
};

const STATUS_TO_GROUP: Record<string, TaskGroup> = {
  todo: "must",
  doing: "doing",
  waiting: "waiting",
  completed: "done",
};

export function toTask(row: {
  id: string;
  title: string;
  description: string;
  status: string;
  group: string;
  projectId: string | null;
  isTodayFocus: boolean;
  dueDate: Date | null;
  artifacts?: string | null;
  readyForConfirm?: boolean | null;
}): Task {
  return {
    id: row.id,
    text: row.title,
    done: row.status === "completed",
    // 分组以持久化 group 为准（创建时确定，完成不移组）；兼容旧数据回退到 status 映射
    group: (["must", "doing", "waiting", "done"] as const).includes(row.group as TaskGroup)
      ? (row.group as TaskGroup)
      : STATUS_TO_GROUP[row.status] ?? "must",
    projectId: row.projectId ?? undefined,
    note: row.description || undefined,
    isTodayFocus: row.isTodayFocus,
    status: row.status,
    artifacts: parseArtifactsJson(row.artifacts),
    readyForConfirm: row.readyForConfirm ?? false,
  };
}

export function toProject(row: {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  folderPath?: string;
  isTodayFocus?: boolean;
  updatedAt?: Date | null;
}): Project {
  // 已完成的项目（标记完成 = 项目做完）无论是否有任务，进度都显示 100%
  const progress = row.status === "completed" ? 100 : row.progress;
  return {
    id: row.id,
    name: row.name,
    desc: row.description,
    progress,
    status: (row.status === "active" ? "进行中" : row.status === "paused" ? "暂停" : row.status === "completed" ? "已完成" : "待开始") as Project["status"],
    stage: "",
    folderPath: row.folderPath ?? "",
    isTodayFocus: row.isTodayFocus ?? false,
    updatedAt: row.updatedAt ? formatTime(row.updatedAt) : "",
    tasks: [],
    noteIds: [],
  };
}

export function formatTime(d: Date): string {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `今天 ${hh}:${mm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hh}:${mm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDate(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function calcProgress(tasks: { status: string }[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "completed").length;
  return Math.round((done / tasks.length) * 100);
}

function toReminder(r: { id: string; title: string; content: string; remindAt: Date | null; status?: string }): Reminder {
  const time = r.remindAt
    ? `${String(r.remindAt.getHours()).padStart(2, "0")}:${String(r.remindAt.getMinutes()).padStart(2, "0")}`
    : "09:00";
  let dayLabel = "";
  if (r.remindAt) {
    const now = new Date();
    const d = r.remindAt;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
    if (diffDays === 0) dayLabel = "今天";
    else if (diffDays === 1) dayLabel = "明天";
    else if (diffDays === -1) dayLabel = "昨天";
    else dayLabel = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return {
    id: r.id,
    time,
    title: r.title,
    meta: r.content || "提醒",
    remindAt: r.remindAt ? r.remindAt.toISOString() : undefined,
    dayLabel: dayLabel || undefined,
    status: r.status ?? "pending",
  };
}

const ASSET_TYPE_LABEL: Record<string, string> = {
  sop: "SOP",
  prompt: "Prompt",
  skill: "Skill",
  project_memory: "项目记忆",
  review: "复盘记录",
};

export function assetTypeKey(label: string): string {
  const map: Record<string, string> = {
    SOP: "sop",
    Prompt: "prompt",
    Skill: "skill",
    项目记忆: "project_memory",
    复盘记录: "review",
  };
  return map[label] ?? "sop";
}

function noteTypeLabel(type: string): string {
  const map: Record<string, string> = {
    note: "笔记",
    document: "文档",
    prompt: "提示词",
    learning: "学习",
    idea: "灵感",
    review: "复盘",
    life: "生活",
  };
  return map[type] ?? type;
}

function noteTypeKey(type: string): string {
  const map: Record<string, string> = {
    笔记: "note",
    文档: "document",
    提示词: "prompt",
    学习: "learning",
    灵感: "idea",
    复盘: "review",
    生活: "life",
    读书笔记: "note",
    客户分析: "document",
    模板: "note",
    // 英文原值直通（life 等）
    life: "life",
    note: "note",
    document: "document",
    prompt: "prompt",
    learning: "learning",
    idea: "idea",
    review: "review",
  };
  return map[type] ?? "note";
}

/* ── Dashboard ── */

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getDashboard(): Promise<DashboardData> {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // 本周一 00:00
  const [tasks, projects, notes, resources, learning, assets, reminders, weekNotes, usageRows] = await Promise.all([
    prisma.task.findMany(),
    prisma.project.findMany(),
    prisma.note.findMany({ where: { projectId: null }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.resource.findMany(),
    prisma.learningRecord.findMany(),
    prisma.asset.findMany(),
    prisma.reminder.findMany({ orderBy: { remindAt: "asc" } }),
    prisma.note.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.dailyUsage.findMany({ orderBy: { date: "desc" }, take: 7 }),
  ]);
  // 已完成项目沉底（与 getProjects 排序一致），其余按更新时间倒序
  projects.sort((a, b) => {
    const rank = (s: string) => (s === "completed" ? 1 : 0);
    return rank(a.status) - rank(b.status) || b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  // 今日执行/今日状态统计范围：个人任务 + 今日焦点项目的任务（未设焦点项目则只有个人任务）
  const focusProject = projects.find((p) => p.isTodayFocus) ?? null;
  const todayTasks = tasks.filter((t) => !t.projectId || (focusProject && t.projectId === focusProject.id));

  const total = todayTasks.length;
  const doneCount = todayTasks.filter((t) => t.status === "completed").length;
  const todoCount = todayTasks.filter((t) => t.status === "todo").length;
  const waitingCount = todayTasks.filter((t) => t.status === "waiting").length;
  // 今日执行卡片左右列计数（左列按 group 分类，右列按 status 状态）
  const execGroups = {
    cats: {
      must: todayTasks.filter((t) => t.group === "must").length,
      doing: todayTasks.filter((t) => t.group === "doing").length,
      waiting: todayTasks.filter((t) => t.group === "waiting").length,
    },
    stats: {
      done: doneCount,
      doing: todayTasks.filter((t) => t.status === "doing").length,
      pending: todayTasks.filter((t) => t.status === "todo" || t.status === "waiting").length,
    },
  };
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const focusTask = tasks.find((t) => t.isTodayFocus && t.status !== "completed") ?? null;

  const projectRows = projects.map((p) => {
    const ptasks = tasks.filter((t) => t.projectId === p.id);
    return { ...p, _progress: calcProgress(ptasks), _tasks: ptasks };
  });

  // 首页“最近活动”：每个项目取最近一条进度事件（详情页展开任务后产生）
  const recentEvents = await Promise.all(
    projectRows.map((p) =>
      prisma.progressEvent
        .findFirst({ where: { projectId: p.id }, orderBy: { createdAt: "desc" } })
        .then((ev) => (ev ? { id: p.id, detail: ev.detail, time: formatTime(ev.createdAt) } : null)),
    ),
  );
  const recentMap = new Map(
    recentEvents.filter(Boolean).map((r) => [r!.id, { detail: r!.detail, time: r!.time }]),
  );

  const learnedToday = learning.reduce((s, r) => s + r.progress, 0);
  const targetMinutes = 60;

  return {
    stats: {
      feature: { value: focusTask ? 1 : 0, label: "今日最重要" },
      cells: [
        { label: "必须完成", value: todoCount },
        { label: "进行中项目", value: activeProjects },
        { label: "等待处理", value: waitingCount },
        { label: "今日完成", value: doneCount },
      ],
    },
    execDone: doneCount,
    execTotal: total,
    execGroups,
    projects: projectRows.map((p) => ({
      ...toProject({ ...p, progress: p._progress }),
      tasks: p._tasks.map(toTask),
      recentActivity: recentMap.get(p.id) ?? undefined,
    })),
    resources: [
      { id: "r1", label: "收集箱", count: resources.filter((r) => r.type === "inbox" && r.status === "open").length, href: "/inbox" },
      { id: "r2", label: "领域库", count: resources.filter((r) => r.type === "domain").length, href: "/resources/domain" },
      { id: "r3", label: "项目库", count: projects.length, href: "/projects" },
      { id: "r4", label: "学习库", count: learning.length, href: "/learning" },
      { id: "r5", label: "知识库", count: resources.filter((r) => r.type === "knowledge").length, href: "/resources/knowledge" },
      { id: "r6", label: "指令库", count: resources.filter((r) => r.type === "command").length, href: "/resources/command" },
      { id: "r7", label: "模板库", count: resources.filter((r) => r.type === "template").length, href: "/resources/template" },
    ],
    reminders: reminders.map(toReminder),
    notes: notes.slice(0, 6).map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      type: noteTypeLabel(n.type),
      time: formatTime(n.createdAt),
    })),
    learning: {
      percent: 0,
      learnedMinutes: usageRows.reduce((s, r) => s + r.seconds, 0) / 60,
      targetMinutes,
      planCount: learning.length,
      cardCount: notes.length,
      activePlanCount: learning.filter((l) => l.progress > 0 && l.progress < 100).length,
      activePlanProgress: (() => {
        const active = learning.filter((l) => l.progress > 0 && l.progress < 100);
        return active.length > 0 ? Math.round(active.reduce((s, l) => s + l.progress, 0) / active.length) : 0;
      })(),
      usageTodaySeconds: usageRows.find((r) => r.date === todayKey())?.seconds ?? 0,
      usageWeekSeconds: usageRows.reduce((s, r) => s + r.seconds, 0),
      weekNotesCount: weekNotes,
      assetCount: assets.length,
      plans: learning.slice(0, 2).map((l) => ({
        id: l.id,
        title: l.title,
        minutes: l.progress,
        targetMinutes: 100,
        state: (l.progress >= 100 ? "已完成" : l.progress > 0 ? "进行中" : "待开始") as LearningRecord["state"],
        kind: "学习",
        date: formatDate(l.createdAt),
      })),
    },
    life: [
      { id: "f1", kind: "heart", label: "家庭", meta: "晚上与家人视频" },
      { id: "f2", kind: "sun", label: "健康", meta: "晨跑 5km", done: true },
      { id: "f3", kind: "bolt", label: "精力", meta: "午后冥想 15 分钟" },
      { id: "f4", kind: "book", label: "成长", meta: "阅读 20 分钟" },
    ],
    quick: [
      { id: "q1", label: "收集箱", icon: "inbox", href: "/inbox" },
      { id: "q2", label: "今日计划", icon: "calendar", href: "/today" },
      { id: "q3", label: "新建笔记", icon: "note", href: "/notes" },
      { id: "q4", label: "新建项目", icon: "project", href: "/projects" },
      { id: "q5", label: "语音记录", icon: "mic", href: "/notes" },
    ],
    aiTags: ["整理今天的收集箱", "总结这篇文档", "制定明日计划", "复盘本周工作"],
    assets: [
      { id: "a1", label: "SOP", count: assets.filter((a) => a.type === "sop").length },
      { id: "a2", label: "Prompt", count: assets.filter((a) => a.type === "prompt").length },
      { id: "a3", label: "Skill", count: assets.filter((a) => a.type === "skill").length },
      { id: "a4", label: "项目记忆", count: assets.filter((a) => a.type === "project_memory").length },
      { id: "a5", label: "复盘记录", count: assets.filter((a) => a.type === "review").length },
    ],
    focus: (() => {
      // 焦点：项目优先（今日项目），其次任务（今日最重要任务）
      const focusProject = projects.find((p) => p.isTodayFocus) ?? null;
      const focusTask = !focusProject ? tasks.find((t) => t.isTodayFocus && t.status !== "completed") ?? null : null;

      if (focusProject) {
        const ptasks = tasks.filter((t) => t.projectId === focusProject.id);
        const done = ptasks.filter((t) => t.status === "completed").length;
        const total = ptasks.length;
        const next = ptasks.find((t) => t.status !== "completed");
        const progress = calcProgress(ptasks);
        const allDone = total > 0 && done === total;
        return {
          kind: "project",
          eyebrow: "今日最重要",
          tag: "今日项目",
          title: focusProject.name,
          desc: focusProject.description || "今天专注推进这个项目。",
          source: "项目",
          stage: focusProject.status === "active" ? "进行中" : focusProject.status === "paused" ? "暂停" : focusProject.status === "completed" ? "已完成" : "待开始",
          progress,
          mainTask: next?.title ?? (allDone ? "全部完成" : "暂无任务"),
          status: allDone ? "已完成" : focusProject.status === "active" ? "进行中" : "待开始",
          nextStep: allDone ? "项目任务已全部完成，可以复盘了" : next?.description || "开始推进这项任务",
          projectId: focusProject.id,
          done,
          total,
          focusHref: `/projects/${focusProject.id}`,
        };
      }

      if (focusTask) {
        return {
          kind: "task",
          eyebrow: "今日最重要",
          tag: "AI 赋能任务",
          title: focusTask.title,
          desc: focusTask.description || "把注意力留给真正重要的事。",
          source: projects.find((p) => p.id === focusTask.projectId)?.name ?? "个人待办",
          stage: STATUS_TO_GROUP[focusTask.status] === "doing" ? "进行中" : "待开始",
          progress: focusTask.status === "completed" ? 100 : 0,
          mainTask: focusTask.title,
          status: focusTask.status === "completed" ? "已完成" : focusTask.status === "doing" ? "进行中" : "待开始",
          nextStep: focusTask.description || "开始推进这项任务",
          focusHref: "/today",
        };
      }

      return {
        kind: "none",
        eyebrow: "今日最重要",
        tag: "AI 赋能任务",
        title: "",
        desc: "",
        source: "",
        stage: "",
        progress: 0,
        mainTask: "",
        status: "",
        nextStep: "",
        focusHref: "/today",
      };
    })(),
  };
}

/* ── 待办 ── */

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

export async function getTodayTasks(): Promise<Task[]> {
  // /today 只显示个人任务；项目任务在项目详情页管理，互不混杂
  const tasks = await prisma.task.findMany({
    where: { projectId: null },
    orderBy: { createdAt: "asc" },
  });
  return tasks.map(toTask);
}

export async function createTask(input: { title: string; group?: TaskGroup; projectId?: string }): Promise<Task> {
  const t = await prisma.task.create({
    data: {
      title: input.title,
      status: input.group ? GROUP_TO_STATUS[input.group] : "todo",
      group: input.group ?? "must",
      projectId: input.projectId ?? null,
    },
  });
  if (t.projectId) await syncProjectProgress(t.projectId);
  return toTask(t);
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  await prisma.task.update({
    where: { id },
    data: { status: done ? "completed" : "todo", completedAt: done ? new Date() : null, readyForConfirm: false },
  });
  await syncProjectProgressForTask(id);
}

export async function updateTaskStatus(id: string, status: string): Promise<void> {
  await prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "completed" ? new Date() : null, readyForConfirm: false },
  });
  await syncProjectProgressForTask(id);
}

/** 删除任务（删除后同步所属项目进度） */
export async function deleteTask(id: string): Promise<void> {
  const t = await prisma.task.findUnique({ where: { id } });
  if (!t) return;
  await prisma.task.delete({ where: { id } });
  if (t.projectId) await syncProjectProgress(t.projectId);
}

export async function setTaskFocus(id: string, isFocus: boolean): Promise<void> {
  if (isFocus) {
    // 焦点唯一：设为任务焦点的同时清除其他任务 + 项目焦点
    await prisma.task.updateMany({ data: { isTodayFocus: false } });
    await prisma.project.updateMany({ data: { isTodayFocus: false } });
    await prisma.task.update({ where: { id }, data: { isTodayFocus: true } });
  } else {
    await prisma.task.update({ where: { id }, data: { isTodayFocus: false } });
  }
}

export async function setProjectFocus(id: string, isFocus: boolean): Promise<void> {
  if (isFocus) {
    // 焦点唯一：设为项目焦点的同时清除任务焦点 + 其他项目焦点
    await prisma.task.updateMany({ data: { isTodayFocus: false } });
    await prisma.project.updateMany({ data: { isTodayFocus: false } });
    await prisma.project.update({ where: { id }, data: { isTodayFocus: true } });
  } else {
    await prisma.project.update({ where: { id }, data: { isTodayFocus: false } });
  }
}

export async function syncProjectProgressForTask(taskId: string) {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (t?.projectId) await syncProjectProgress(t.projectId);
}

export async function syncProjectProgress(projectId: string) {
  const tasks = await prisma.task.findMany({ where: { projectId } });
  const progress = calcProgress(tasks);
  await prisma.project.update({ where: { id: projectId }, data: { progress } });
}

/* ── 项目 ── */

export async function getProjects(): Promise<Project[]> {
  const projects = await prisma.project.findMany();
  // 已完成沉底（标记完成会更新 updatedAt，不能按时间裸排），其余按更新时间倒序
  projects.sort((a, b) => {
    const rank = (s: string) => (s === "completed" ? 1 : 0);
    return rank(a.status) - rank(b.status) || b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  const tasks = await prisma.task.findMany();
  return projects.map((p) => {
    const ptasks = tasks.filter((t) => t.projectId === p.id);
    return {
      ...toProject({ ...p, progress: calcProgress(ptasks) }),
      tasks: ptasks.map(toTask),
      noteIds: [],
    };
  });
}

export async function getProject(id: string): Promise<Project | null> {
  const p = await prisma.project.findUnique({ where: { id } });
  if (!p) return null;
  const tasks = await prisma.task.findMany({ where: { projectId: id }, orderBy: { createdAt: "asc" } });
  // 惰性迁移（第一期任务）：【预期产物】文本段 → artifacts 字段
  await migrateTaskArtifactsBatch(tasks);
  const [notes, recentEv] = await Promise.all([
    prisma.note.findMany({ where: { projectId: id } }),
    prisma.progressEvent.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  const out = {
    ...toProject({ ...p, progress: calcProgress(tasks) }),
    tasks: tasks.map(toTask),
    noteIds: notes.map((n) => n.id),
    recentActivity: recentEv ? { detail: recentEv.detail, time: formatTime(recentEv.createdAt) } : undefined,
  };
  // 卡住提醒：未完成 + 有产物 + 最近动静（最新事件/创建时间）超过 STALLED_DAYS → stalled
  if (p.folderPath) {
    const unfinished = tasks.filter((t) => t.status !== "completed" && parseArtifactsJson(t.artifacts).length > 0);
    if (unfinished.length > 0) {
      const evRows = await prisma.progressEvent.findMany({
        where: { taskId: { in: unfinished.map((t) => t.id) } },
        orderBy: { createdAt: "desc" },
        select: { taskId: true, createdAt: true },
      });
      const lastByTask = new Map<string, Date>();
      for (const e of evRows) {
        if (!lastByTask.has(e.taskId)) lastByTask.set(e.taskId, e.createdAt);
      }
      const now = Date.now();
      for (const t of unfinished) {
        const last = lastByTask.get(t.id) ?? t.createdAt;
        const days = Math.floor((now - last.getTime()) / 86400000);
        if (days >= STALLED_DAYS) {
          const task = out.tasks.find((x) => x.id === t.id);
          if (task) task.stalled = { days };
        }
      }
    }
  }
  return out;
}

export async function createProject(input: { name: string; desc?: string; status?: string; folderPath?: string }): Promise<Project> {
  const p = await prisma.project.create({
    data: { name: input.name, description: input.desc ?? "", status: input.status ?? "active", folderPath: input.folderPath ?? "" },
  });
  return toProject(p);
}

export async function updateProject(
  id: string,
  patch: { name?: string; desc?: string; status?: string; folderPath?: string },
): Promise<Project | null> {
  const p = await prisma.project.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.desc !== undefined ? { description: patch.desc } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.folderPath !== undefined ? { folderPath: patch.folderPath } : {}),
    },
  });
  return toProject(p);
}

/* ── 文档孵化：任务产物（artifacts）序列化 ── */

export interface TaskArtifact {
  type: "file" | "folder" | "glob";
  path?: string; // file / folder 用
  pattern?: string; // glob 用
}

export const ARTIFACT_TYPE_LABEL: Record<string, string> = {
  file: "文件",
  folder: "文件夹",
  glob: "通配",
};

/** artifacts → description 尾部文本段（第一期无 schema 改动，产物路径暂存于任务描述） */
export function serializeArtifacts(artifacts: TaskArtifact[]): string {
  const valid = (artifacts ?? []).filter((a) => {
    const p = (a.path ?? a.pattern ?? "").trim();
    return p && ["file", "folder", "glob"].includes(a.type);
  });
  if (valid.length === 0) return "";
  const lines = valid.map((a) => {
    const p = (a.path ?? a.pattern ?? "").trim().replace(/\\/g, "/");
    return `- ${a.type}: ${p}`;
  });
  return `\n\n【预期产物】\n${lines.join("\n")}`;
}

/** description 尾部文本段 → artifacts（第二期迁移/编辑预览用） */
export function parseArtifacts(text: string): TaskArtifact[] {
  const m = (text ?? "").match(/【预期产物】([\s\S]*)$/);
  if (!m) return [];
  const out: TaskArtifact[] = [];
  for (const line of m[1].split("\n")) {
    const mm = line.trim().match(/^-\s*(file|folder|glob):\s*(.+)$/);
    if (!mm) continue;
    const type = mm[1] as TaskArtifact["type"];
    const p = mm[2].trim();
    if (type === "glob") out.push({ type, pattern: p });
    else out.push({ type, path: p });
  }
  return out;
}

/* ── 文档孵化：AI 计划 → 项目 + 任务批量创建（事务） ── */

export interface IncubateTaskInput {
  title: string;
  description?: string;
  group?: TaskGroup;
  artifacts?: TaskArtifact[];
}

export async function createProjectWithTasks(input: {
  name: string;
  desc?: string;
  folderPath?: string;
  tasks?: IncubateTaskInput[];
  /** 关联资源 id 列表（孵化时勾选的指令/模板等，创建后绑定到新项目） */
  resources?: string[];
}): Promise<{ project: Project; tasks: Task[] }> {
  const name = input.name.trim();
  if (!name) throw new Error("项目名不能为空");
  const validTasks = (input.tasks ?? []).filter((t) => t.title?.trim());
  const groupOk = (g?: string): TaskGroup =>
    g && ["must", "doing", "waiting", "done"].includes(g) ? (g as TaskGroup) : "must";

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name,
        description: input.desc?.trim() ?? "",
        status: "active",
        folderPath: input.folderPath?.trim() ?? "",
      },
    });
    const created: Task[] = [];
    for (const t of validTasks) {
      const group = groupOk(t.group);
      const desc = (t.description ?? "").trim();
      const artifactText = serializeArtifacts(t.artifacts ?? []);
      const row = await tx.task.create({
        data: {
          title: t.title.trim(),
          description: desc + artifactText,
          status: GROUP_TO_STATUS[group],
          group,
          projectId: p.id,
        },
      });
      created.push(toTask(row));
    }
    // 孵化勾选的资产 → 绑定到新项目（关联确认制的落库点）
    const resourceIds = (input.resources ?? []).filter(Boolean);
    if (resourceIds.length > 0) {
      await tx.resource.updateMany({
        where: { id: { in: resourceIds } },
        data: { projectId: p.id },
      });
    }
    return { project: p, tasks: created };
  });

  const progress = calcProgress(result.tasks as unknown as { status: string }[]);
  return {
    project: toProject({ ...result.project, progress }),
    tasks: result.tasks,
  };
}

/* ── 历史项目导入（E:\我的项目 已完成项目批量登记，不拆任务） ── */

/** 扫描历史项目根目录：列出子目录 + 是否已导入（按 folderPath/name 匹配） */
export async function scanProjectsDir() {
  const root = "E:\\我的项目";
  const EXCLUDE = new Set(["personal-os", "测试项目"]); // 系统本体 / 测试目录不导入
  const existing = await prisma.project.findMany({ select: { name: true, folderPath: true } });
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !EXCLUDE.has(d.name))
    .map((d) => ({ name: d.name, folderPath: path.join(root, d.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh"));
  return dirs.map((d) => ({
    ...d,
    imported: existing.some((p) => p.folderPath === d.folderPath || p.name === d.name),
  }));
}

/** 批量导入历史项目（只登记项目 + folderPath，不建任务） */
export async function importProjects(inputs: { name: string; folderPath: string; status?: string }[]) {
  const created = [];
  for (const it of inputs) {
    const name = (it.name ?? "").trim();
    if (!name) continue;
    const p = await prisma.project.create({
      data: {
        name,
        description: "",
        status: it.status === "completed" ? "completed" : "active",
        folderPath: (it.folderPath ?? "").trim(),
      },
    });
    created.push(toProject({ ...p, progress: 0 }));
  }
  return created;
}

/**
 * AI 生成项目档案（A 方案：导入的历史项目有真实依据的总结笔记）
 * 扫描项目目录的 README/文档/package.json → DeepSeek 总结 → 存为关联项目的笔记
 */
export async function generateProjectArchive(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("项目不存在");
  const root = (project.folderPath ?? "").trim();
  if (!root || !fs.existsSync(root)) throw new Error("项目未关联文件夹，无法生成档案");

  // 去重：已有同标题档案笔记则跳过，不重复生成
  const dup = await prisma.note.findFirst({
    where: { projectId: project.id, title: `${project.name} · 项目档案` },
  });
  if (dup) return { id: dup.id, title: dup.title, type: dup.type, time: formatTime(dup.createdAt), skipped: true };

  // 收集候选说明文件：README/文档/package.json 等（根目录优先，最多 4 个，每个 4000 字符）
  const README_RE = /^(readme|readme\.md|readme\.txt|说明|项目说明|介绍)/i;
  const candidates: { name: string; text: string }[] = [];
  const pushFile = (p: string) => {
    try {
      if (!fs.statSync(p).isFile()) return;
      const text = fs.readFileSync(p, "utf8").slice(0, 4000);
      if (text.trim()) candidates.push({ name: path.basename(p), text });
    } catch {
      /* 忽略读不到的文件 */
    }
  };
  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    /* 目录不可读 */
  }
  const mdDocs: string[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (README_RE.test(e.name)) pushFile(path.join(root, e.name));
    else if (e.name === "package.json" || e.name === "requirements.txt" || e.name === "pyproject.toml" || e.name === "go.mod") pushFile(path.join(root, e.name));
    else if (/\.(md|markdown|txt)$/i.test(e.name)) mdDocs.push(e.name);
    if (candidates.length >= 2) break;
  }
  for (const n of mdDocs.slice(0, 2)) pushFile(path.join(root, n));
  if (candidates.length === 0) throw new Error("未找到 README/文档，无法生成档案");

  const material = candidates
    .map((c) => `【${c.name}】\n${c.text}`)
    .join("\n\n---\n\n")
    .slice(0, 8000);

  const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
  const API_KEY = process.env.DSH_DEEPSEEK_KEY;
  if (!API_KEY) throw new Error("未配置 DSH_DEEPSEEK_KEY");

  const prompt = `你是项目档案整理员。根据下面这个已完成项目的真实文件内容，生成一份简洁的项目档案（Markdown 格式）。
要求：
1. 只根据提供的内容总结，**不要编造文件里没有的信息**；内容不足就写"（未在文档中说明）"
2. 结构：\n# 项目概述\n\n## 技术栈\n\n## 核心功能\n\n## 实现要点\n\n## 使用方式\n3. 总长度 200-500 字，中文。\n\n项目名：${project.name}\n\n文件内容：\n${material}`;

  const res = await fetch(`${API_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AI 服务错误 ${res.status}`);
  const json = await res.json();
  const summary = (json?.choices?.[0]?.message?.content ?? "").trim();
  if (!summary) throw new Error("AI 返回为空");

  const note = await prisma.note.create({
    data: {
      title: `${project.name} · 项目档案`,
      content: summary,
      type: "项目档案",
      projectId: project.id,
    },
  });
  return { id: note.id, title: note.title, type: note.type, time: formatTime(note.createdAt) };
}

/**
 * AI 生成项目复盘（导入历史项目自动沉淀用）
 * 素材：项目档案笔记（generateProjectArchive 产物）→ DeepSeek 生成复盘并落库
 * 去重：已有同名「项目名 · 项目复盘」则跳过
 */
export async function generateProjectReview(projectId: string): Promise<{ id: string; title: string; skipped?: boolean }> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("项目不存在");

  const title = `${project.name} · 项目复盘`;
  const dup = await prisma.review.findFirst({ where: { title } });
  if (dup) return { id: dup.id, title, skipped: true };

  // 素材：优先取项目档案笔记；没有则用项目描述
  const archive = await prisma.note.findFirst({
    where: { projectId: project.id, title: { contains: "项目档案" } },
    orderBy: { createdAt: "desc" },
  });
  const material = archive?.content
    ? `【项目档案】\n${archive.content.slice(0, 3000)}`
    : project.description
      ? `【项目描述】\n${project.description}`
      : "";
  if (!material.trim()) throw new Error("项目没有档案笔记/描述，先生成档案");

  const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
  const API_KEY = process.env.DSH_DEEPSEEK_KEY;
  if (!API_KEY) throw new Error("未配置 DSH_DEEPSEEK_KEY");

  const prompt = `你是项目复盘教练。根据下面已完成项目「${project.name}」的档案，写一份简洁复盘。
只输出 JSON（不要其他文字）：{"summary": "总结 2-3 句", "wins": ["亮点1", "亮点2"], "losses": ["不足1"], "next": ["沉淀/复用建议1"]}
要求：只基于提供内容，不编造；亮点指技术方案/架构/可复用经验；不足如无内容就写"（未在文档中说明）"。
\n${material}`;

  const res = await fetch(`${API_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.4,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`AI 服务错误 ${res.status}`);
  const json = await res.json();
  const text = (json?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("AI 返回为空");

  let parsed: { summary?: string; wins?: string[]; losses?: string[]; next?: string[] } = {};
  try {
    const m = text.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  } catch {
    parsed = {};
  }
  const period = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`;
  const r = await prisma.review.create({
    data: {
      title,
      period,
      summary: parsed.summary ?? text,
      achievements: Array.isArray(parsed.wins) ? parsed.wins.join("\n") : "",
      problems: Array.isArray(parsed.losses) ? parsed.losses.join("\n") : "",
      nextPlan: Array.isArray(parsed.next) ? parsed.next.join("\n") : "",
    },
  });
  return { id: r.id, title: r.title };
}

/** 项目时间线：聚合该项目所有任务的进度事件（含项目创建节点），倒序 */
export async function getProjectTimeline(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return [];
  const events = await prisma.progressEvent.findMany({
    where: { OR: [{ projectId }, { task: { projectId } }] },
    include: { task: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const lines = events.map((e) => ({
    id: e.id,
    type: e.type,
    detail: e.detail,
    taskTitle: e.task?.title ?? "",
    time: formatTime(e.createdAt),
  }));
  // 项目创建作为起点
  lines.push({ id: "created", type: "project_created", detail: `项目「${project.name}」创建`, taskTitle: "", time: formatTime(project.createdAt) });
  return lines;
}

/* ── 笔记 ── */

export async function getNotes(): Promise<Note[]> {
  const notes = await prisma.note.findMany({ orderBy: { createdAt: "desc" } });
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    type: noteTypeLabel(n.type),
    time: formatTime(n.createdAt),
    projectId: n.projectId ?? undefined,
  }));
}

export async function createNote(input: { title: string; content: string; type?: string; projectId?: string }): Promise<Note> {
  const n = await prisma.note.create({
    data: {
      title: input.title,
      content: input.content,
      type: input.type ? noteTypeKey(input.type) : "note",
      projectId: input.projectId ?? null,
    },
  });
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    type: noteTypeLabel(n.type),
    time: formatTime(n.createdAt),
    projectId: n.projectId ?? undefined,
  };
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string; type?: string },
): Promise<Note | null> {
  const n = await prisma.note.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.type !== undefined ? { type: noteTypeKey(patch.type) } : {}),
    },
  });
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    type: noteTypeLabel(n.type),
    time: formatTime(n.createdAt),
    projectId: n.projectId ?? undefined,
  };
}

/** 笔记挂靠到项目（孤儿档案一键归属）；projectId 传 null 解除挂靠 */
export async function attachNoteToProject(noteId: string, projectId: string | null): Promise<Note | null> {
  const n = await prisma.note.update({ where: { id: noteId }, data: { projectId } });
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    type: noteTypeLabel(n.type),
    time: formatTime(n.createdAt),
    projectId: n.projectId ?? undefined,
  };
}

/* ── 摩擦日志（任务卡点记录，喂给复盘） ── */

export interface FrictionLogItem {
  id: string;
  content: string;
  taskId: string | null;
  projectId: string | null;
  taskTitle: string;
  time: string;
}

export async function createFrictionLog(input: { content: string; taskId?: string; projectId?: string }): Promise<FrictionLogItem> {
  const content = (input.content ?? "").trim();
  if (!content) throw new Error("摩擦内容不能为空");
  const f = await prisma.frictionLog.create({
    data: { content, taskId: input.taskId ?? null, projectId: input.projectId ?? null },
  });
  return {
    id: f.id,
    content: f.content,
    taskId: f.taskId,
    projectId: f.projectId,
    taskTitle: "",
    time: formatTime(f.createdAt),
  };
}

export async function getFrictionLogs(input?: { taskId?: string; projectId?: string; days?: number; limit?: number }): Promise<FrictionLogItem[]> {
  const days = input?.days && input.days > 0 ? input.days : 7;
  const rows = await prisma.frictionLog.findMany({
    where: {
      ...(input?.taskId ? { taskId: input.taskId } : {}),
      ...(input?.projectId ? { projectId: input.projectId } : {}),
      createdAt: { gte: new Date(Date.now() - days * 86400000) },
    },
    include: { task: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: input?.limit ?? 50,
  });
  return rows.map((f) => ({
    id: f.id,
    content: f.content,
    taskId: f.taskId,
    projectId: f.projectId,
    taskTitle: f.task?.title ?? "",
    time: formatTime(f.createdAt),
  }));
}

export async function deleteFrictionLog(id: string): Promise<void> {
  await prisma.frictionLog.delete({ where: { id } });
}

/* ── 学习 ── */

/** 本周新增笔记（学习中心「本周沉淀」用） */
export async function getWeekNotes() {
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // 本周一 00:00
  const rows = await prisma.note.findMany({
    where: { createdAt: { gte: weekStart } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, type: true, createdAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, type: noteTypeLabel(r.type), time: formatTime(r.createdAt) }));
}

export async function getLearningRecords(): Promise<LearningRecord[]> {
  const records = await prisma.learningRecord.findMany({ orderBy: { createdAt: "desc" } });
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    minutes: r.progress,
    targetMinutes: 100,
    state: (r.progress >= 100 ? "已完成" : r.progress > 0 ? "进行中" : "待开始") as LearningRecord["state"],
    kind: "学习",
    date: formatDate(r.createdAt),
  }));
}

export async function createLearningRecord(input: { title: string; content?: string; progress?: number }): Promise<LearningRecord> {
  const r = await prisma.learningRecord.create({
    data: { title: input.title, content: input.content ?? "", progress: input.progress ?? 0 },
  });
  return {
    id: r.id,
    title: r.title,
    minutes: r.progress,
    targetMinutes: 100,
    state: (r.progress >= 100 ? "已完成" : r.progress > 0 ? "进行中" : "待开始") as LearningRecord["state"],
    kind: "学习",
    date: formatDate(r.createdAt),
  };
}

/* ── 复盘 ── */

export async function getReviews(): Promise<Review[]> {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  return reviews.map((r) => ({
    id: r.id,
    title: r.title || (r.period ? `${r.period}复盘` : "复盘"),
    period: r.period || formatDate(r.createdAt),
    date: formatTime(r.createdAt),
    summary: r.summary,
    wins: r.achievements ? r.achievements.split("\n").filter(Boolean) : [],
    losses: r.problems ? r.problems.split("\n").filter(Boolean) : [],
    next: r.nextPlan ? r.nextPlan.split("\n").filter(Boolean) : [],
  }));
}

export async function createReview(input: {
  period?: string;
  summary: string;
  wins?: string;
  losses?: string;
  next?: string;
  title?: string;
}): Promise<Review> {
  const r = await prisma.review.create({
    data: {
      title: input.title ?? "",
      period: input.period ?? formatDate(new Date()),
      summary: input.summary,
      achievements: input.wins ?? "",
      problems: input.losses ?? "",
      nextPlan: input.next ?? "",
    },
  });
  return {
    id: r.id,
    title: r.title || `${r.period}复盘`,
    period: r.period,
    date: formatTime(r.createdAt),
    summary: r.summary,
    wins: r.achievements.split("\n").filter(Boolean),
    losses: r.problems.split("\n").filter(Boolean),
    next: r.nextPlan.split("\n").filter(Boolean),
  };
}

/* ── 收集箱 ── */

export async function getInboxItems(): Promise<InboxItem[]> {
  const items = await prisma.resource.findMany({ where: { type: "inbox" }, orderBy: { createdAt: "desc" } });
  return items.map((i) => ({
    id: i.id,
    text: i.name,
    source: i.description || "随手记",
    time: formatTime(i.createdAt),
    handled: i.status === "handled",
  }));
}

export async function createInboxItem(input: { text: string; source?: string }): Promise<InboxItem> {
  const i = await prisma.resource.create({
    data: { name: input.text, type: "inbox", description: input.source ?? "随手记", status: "open" },
  });
  return {
    id: i.id,
    text: i.name,
    source: i.description || "随手记",
    time: formatTime(i.createdAt),
    handled: false,
  };
}

export async function markInboxHandled(id: string, handled: boolean): Promise<void> {
  await prisma.resource.update({ where: { id }, data: { status: handled ? "handled" : "open" } });
}

/* ── 通用资源条目（资源中心卡片用；type: inbox/domain/template 等） ── */

/** 按类型查资源（领域库/知识库/指令库/模板库等子页面用） */
export async function getResources(type: string): Promise<{ id: string; name: string; description: string; url: string; time: string; projectId: string | null; projectName: string }[]> {
  const rows = await prisma.resource.findMany({
    where: { type },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    url: r.url ?? "",
    time: formatTime(r.createdAt),
    projectId: r.projectId ?? null,
    projectName: r.project?.name ?? "",
  }));
}

/** 项目关联资源（项目详情页“关联资产”区块）：按类型分组 */
export async function getProjectResources(projectId: string) {
  const rows = await prisma.resource.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    type: r.type,
    time: formatTime(r.createdAt),
  }));
}

/** 解绑资源与项目（关联资产移除） */
export async function clearResourceProject(id: string): Promise<void> {
  await prisma.resource.update({ where: { id }, data: { projectId: null } });
}

/** 按 id 删除资源条目 */
export async function deleteResource(id: string): Promise<void> {
  await prisma.resource.delete({ where: { id } });
}

export async function createResourceEntry(input: {
  name: string;
  type?: string;
  description?: string;
  url?: string;
  projectId?: string | null;
}): Promise<{ id: string; name: string; type: string; time: string }> {
  const r = await prisma.resource.create({
    data: {
      name: input.name,
      type: input.type ?? "domain",
      description: input.description ?? "",
      url: input.url ?? "",
      projectId: input.projectId ?? null,
      status: "open",
    },
  });
  return { id: r.id, name: r.name, type: r.type, time: formatTime(r.createdAt) };
}

/** 删除指定类型的最近一条资源（资源中心卡片删除用），返回被删条目名 */
export async function deleteLatestResourceEntry(type: string): Promise<{ deleted: string } | null> {
  const latest = await prisma.resource.findFirst({
    where: { type },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return null;
  await prisma.resource.delete({ where: { id: latest.id } });
  return { deleted: latest.name };
}

/* ── 资产 ── */

export async function getAssets(): Promise<Asset[]> {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  return assets.map((a) => ({
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
    projectId: a.projectId ?? undefined,
  }));
}

/** 项目关联的长期资产（项目详情页用） */
export async function getProjectAssets(projectId: string) {
  const rows = await prisma.asset.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((a) => ({
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
    projectId: a.projectId ?? undefined,
  }));
}

export async function updateAsset(
  id: string,
  patch: { title?: string; content?: string; kind?: string; projectId?: string | null },
): Promise<Asset | null> {
  const a = await prisma.asset.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.kind !== undefined ? { type: assetTypeKey(patch.kind) } : {}),
      ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
    },
  });
  return {
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
    projectId: a.projectId ?? undefined,
  };
}

export async function createAsset(input: { title: string; content: string; kind: string; projectId?: string }): Promise<Asset> {
  const a = await prisma.asset.create({
    data: {
      title: input.title,
      content: input.content,
      type: assetTypeKey(input.kind),
      projectId: input.projectId ?? null,
    },
  });
  return {
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
  };
}

/* ── 提醒 ── */

export async function getReminders(): Promise<Reminder[]> {
  const reminders = await prisma.reminder.findMany({ orderBy: { remindAt: "asc" } });
  return reminders.map(toReminder);
}

export async function createReminder(input: {
  title: string;
  content?: string;
  remindAt?: string; // "14:30" 或 ISO
}): Promise<Reminder> {
  let remindAt: Date | null = null;
  if (input.remindAt) {
    // 仅纯 HH:mm 视为当天时间；其余按完整日期/ISO 解析（ISO 也含冒号，不能靠 includes 判断）
    if (/^\d{1,2}:\d{2}$/.test(input.remindAt)) {
      const [h, m] = input.remindAt.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      remindAt = d;
    } else {
      remindAt = new Date(input.remindAt);
    }
  }
  const r = await prisma.reminder.create({
    data: { title: input.title, content: input.content ?? "", remindAt },
  });
  return toReminder(r);
}

export async function updateReminderStatus(id: string, status: string): Promise<void> {
  await prisma.reminder.update({ where: { id }, data: { status } });
}

export async function deleteReminder(id: string): Promise<void> {
  await prisma.reminder.delete({ where: { id } });
}

/* ── AI 会话 ── */

export async function getConversation(): Promise<ConversationMessage[]> {
  const conv = await prisma.aiConversation.findFirst({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  if (!conv) return [];
  return conv.messages.map((m) => ({
    id: m.id,
    role: m.role as ConversationMessage["role"],
    text: m.content,
    time: formatTime(m.createdAt),
  }));
}

export async function saveAiExchange(userText: string, assistantText: string): Promise<void> {
  let conv = await prisma.aiConversation.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!conv) {
    conv = await prisma.aiConversation.create({
      data: { title: userText.slice(0, 20), contextType: "page" },
    });
  }
  await prisma.aiMessage.createMany({
    data: [
      { conversationId: conv.id, role: "user", content: userText },
      { conversationId: conv.id, role: "assistant", content: assistantText },
    ],
  });
  await prisma.aiConversation.update({
    where: { id: conv.id },
    data: {
      updatedAt: new Date(),
      title: conv.title === "新对话" ? userText.slice(0, 20) : conv.title,
    },
  });
}

export async function clearConversation(): Promise<void> {
  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
}

/* ── 复盘闭环：最近完成的任务（供一键引用） ── */

export async function getRecentCompletedTasks(days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.task.findMany({
    where: { status: "completed", completedAt: { gte: since } },
    orderBy: { completedAt: "desc" },
    take: 20,
    select: { id: true, title: true, completedAt: true, projectId: true, project: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    projectName: r.project?.name ?? "",
    date: r.completedAt ? r.completedAt.toISOString().slice(0, 10) : "",
  }));
}

/* ── 晨间启动：昨日遗留任务（昨天及更早创建、未完成） ── */

export async function getCarryoverTasks(limit = 3) {
  const yesterdayStart = new Date();
  yesterdayStart.setHours(0, 0, 0, 0);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const rows = await prisma.task.findMany({
    where: { status: { not: "completed" }, createdAt: { lt: yesterdayStart } },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, title: true, group: true, projectId: true, project: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, group: r.group, projectName: r.project?.name ?? "" }));
}

/* ── 计划 vs 实际（今日统计） ── */

export async function getPlanStats() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [createdToday, doneToday, carryover] = await Promise.all([
    prisma.task.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.task.count({ where: { status: "completed", completedAt: { gte: dayStart } } }),
    prisma.task.count({ where: { status: { not: "completed" }, createdAt: { lt: dayStart } } }),
  ]);
  const total = createdToday + carryover;
  const rate = total > 0 ? Math.round((doneToday / total) * 100) : 0;
  return { createdToday, doneToday, carryover, total, rate };
}

/* ── 进度感知（第二期）：扫描 / 确认 / 产物编辑 / 事件流水 ── */

const ARTIFACT_TYPES = ["file", "folder", "glob"];
const EVENT_MAX_PER_TASK = 50;
const STALLED_DAYS = 5; // 卡住判定：未完成 + 有产物 + 最近动静超过 N 天

/** 解析任务 artifacts JSON 字段（容错：坏 JSON / 非数组 / 坏条目一律丢弃） */
export function parseArtifactsJson(json: string | null | undefined): Artifact[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (a) =>
        a &&
        ARTIFACT_TYPES.includes(a.type) &&
        String(a.path ?? a.pattern ?? "").trim() !== "",
    );
  } catch {
    return [];
  }
}

/** 惰性迁移：第一期任务 description 尾部的【预期产物】段 → artifacts 字段（只迁移一次） */
async function migrateArtifactsFromDesc(task: { id: string; artifacts: string; description: string }): Promise<Artifact[]> {
  const parsed = parseArtifactsJson(task.artifacts);
  if (parsed.length > 0) return parsed;
  const fromDesc = parseArtifacts(task.description ?? "");
  if (fromDesc.length > 0) {
    await prisma.task.update({ where: { id: task.id }, data: { artifacts: JSON.stringify(fromDesc) } });
    return fromDesc;
  }
  return [];
}

/** 批量惰性迁移（getProject 打开详情页时兜底，保证展开区产物可见） */
async function migrateTaskArtifactsBatch(tasks: { id: string; artifacts: string; description: string }[]) {
  for (const t of tasks) {
    if (parseArtifactsJson(t.artifacts).length > 0) continue;
    const fromDesc = parseArtifacts(t.description ?? "");
    if (fromDesc.length > 0) {
      await prisma.task.update({ where: { id: t.id }, data: { artifacts: JSON.stringify(fromDesc) } });
    }
  }
}

async function trimProgressEvents(taskId: string) {
  const count = await prisma.progressEvent.count({ where: { taskId } });
  if (count > EVENT_MAX_PER_TASK) {
    const extra = await prisma.progressEvent.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      take: count - EVENT_MAX_PER_TASK,
      select: { id: true },
    });
    if (extra.length > 0) {
      await prisma.progressEvent.deleteMany({ where: { id: { in: extra.map((e) => e.id) } } });
    }
  }
}

async function addProgressEvent(input: {
  taskId: string;
  projectId: string;
  type: string;
  detail: string;
  path?: string;
}): Promise<{ ev: { id: string; type: string; detail: string; path: string; createdAt: Date }; created: boolean }> {
  const path = input.path ?? "";
  if (input.type === "artifact_matched") {
    // 同任务同路径只记一次（完成依据 = 首次检测时间；重复命中不再刷屏）
    const dup = await prisma.progressEvent.findFirst({
      where: { taskId: input.taskId, type: "artifact_matched", path },
      orderBy: { createdAt: "desc" },
    });
    if (dup) {
      return { ev: dup, created: false };
    }
  }
  const ev = await prisma.progressEvent.create({
    data: {
      taskId: input.taskId,
      projectId: input.projectId,
      type: input.type,
      detail: input.detail,
      path,
    },
  });
  await trimProgressEvents(input.taskId);
  return { ev, created: true };
}

/** 扫描项目文件夹：文件变化命中任务产物 → 更新状态 + 写事件（幂等） */
export async function scanProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("项目不存在");
  const root = (project.folderPath ?? "").trim();
  if (!root || !fs.existsSync(root)) {
    return { skipped: "no_folder", changed: [], events: [] };
  }

  const tasks = await prisma.task.findMany({
    where: { projectId, status: { not: "completed" } },
    orderBy: { createdAt: "asc" },
  });
  const files = walkProject(root);
  const statCache = new Map<string, number>();

  const changed: { taskId: string; title: string; status: string; readyForConfirm: boolean }[] = [];
  const events: { taskId: string; type: string; detail: string; path: string }[] = [];

  for (const task of tasks) {
    const arts = await migrateArtifactsFromDesc(task);
    if (arts.length === 0) continue;

    // 命中 = 产物对应文件存在 且 mtime 晚于任务创建时间（“这个阶段确实动过”的信号）
    const matched: string[] = [];
    for (const art of arts) {
      const hitRel = files.find((rel) => {
        if (!artifactMatches(art, rel)) return false;
        const abs = path.join(root, rel);
        let m = statCache.get(abs);
        if (m === undefined) {
          m = fileMtimeMs(abs);
          statCache.set(abs, m);
        }
        return m > task.createdAt.getTime();
      });
      if (hitRel) matched.push(hitRel);
    }
    if (matched.length === 0) continue;

    const allMatched = matched.length >= arts.length;
    let statusChanged = false;
    let readyChanged = false;
    let wroteNewEvent = false;

    if (task.status === "todo" && !task.readyForConfirm) {
      await prisma.task.update({ where: { id: task.id }, data: { status: "doing" } });
      statusChanged = true;
    }
    if (allMatched && !task.readyForConfirm) {
      await prisma.task.update({ where: { id: task.id }, data: { readyForConfirm: true } });
      readyChanged = true;
    }

    for (const rel of matched) {
      const { ev, created } = await addProgressEvent({
        taskId: task.id,
        projectId,
        type: "artifact_matched",
        detail: `检测到产物更新：${rel}`,
        path: rel,
      });
      if (created) wroteNewEvent = true;
      events.push({ taskId: task.id, type: ev.type, detail: ev.detail, path: ev.path });
    }
    if (statusChanged) {
      const { ev } = await addProgressEvent({
        taskId: task.id,
        projectId,
        type: "status_changed",
        detail: "检测到相关文件变化，任务转为开发中",
      });
      events.push({ taskId: task.id, type: ev.type, detail: ev.detail, path: ev.path });
    }
    if (readyChanged) {
      const { ev } = await addProgressEvent({
        taskId: task.id,
        projectId,
        type: "status_changed",
        detail: "全部预期产物已就位，等待确认完成",
      });
      events.push({ taskId: task.id, type: ev.type, detail: ev.detail, path: ev.path });
    }

    // 只有产生实质变化（状态流转 / 新事件）才报“有进展”，重复命中已就位产物保持静默
    if (statusChanged || readyChanged || wroteNewEvent) {
      changed.push({
        taskId: task.id,
        title: task.title,
        status: readyChanged ? "ready" : statusChanged ? "doing" : task.status,
        readyForConfirm: allMatched || task.readyForConfirm,
      });
    }
  }

  if (changed.length > 0) await syncProjectProgress(projectId);
  return { skipped: undefined, changed, events };
}

/** 用户确认完成：校验 readyForConfirm（或强制）→ completed + 事件 + 进度联动 */
export async function confirmTask(taskId: string, force = false) {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t) throw new Error("任务不存在");
  if (!force && !t.readyForConfirm && t.status !== "completed") {
    throw new Error("任务产物尚未全部就位，请先完成开发再确认");
  }
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "completed", completedAt: new Date(), readyForConfirm: false },
  });
  const { ev } = await addProgressEvent({
    taskId,
    projectId: t.projectId ?? "",
    type: "confirmed",
    detail: "用户确认完成",
  });
  if (t.projectId) await syncProjectProgress(t.projectId);
  const updated = await prisma.task.findUnique({ where: { id: taskId } });
  return { task: updated ? toTask(updated) : null, event: ev };
}

/** 手动修正任务的产物路径（artifacts 字段 + description 尾部同步）；内容有变化时记一条 manual 事件（路径修正次数统计用） */
export async function updateTaskArtifacts(taskId: string, artifacts: Artifact[]) {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t) throw new Error("任务不存在");
  const valid = (Array.isArray(artifacts) ? artifacts : []).filter(
    (a) => a && ARTIFACT_TYPES.includes(a.type) && String(a.path ?? a.pattern ?? "").trim() !== "",
  );
  // 新旧对比：确实有变化才写 manual 事件（避免保存未改动内容刷修正次数）
  const oldArts = parseArtifactsJson(t.artifacts);
  const changed =
    oldArts.length !== valid.length ||
    JSON.stringify(oldArts.map((a) => ({ t: a.type, p: a.path ?? a.pattern ?? "" }))) !==
      JSON.stringify(valid.map((a) => ({ t: a.type, p: a.path ?? a.pattern ?? "" })));
  // description 去掉旧的【预期产物】段后重新拼接（保持双写一致）
  const desc = (t.description ?? "").replace(/【预期产物】[\s\S]*$/, "").trimEnd();
  await prisma.task.update({
    where: { id: taskId },
    data: { artifacts: JSON.stringify(valid), description: desc + serializeArtifacts(valid) },
  });
  if (changed && t.projectId) {
    await addProgressEvent({
      taskId,
      projectId: t.projectId,
      type: "manual",
      detail: "用户修正产物路径",
    });
  }
  const updated = await prisma.task.findUnique({ where: { id: taskId } });
  return updated ? toTask(updated) : null;
}

/** 任务完成依据时间线（最近 50 条） */
export async function getProgressEvents(taskId: string) {
  const events = await prisma.progressEvent.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return events.map((e) => ({
    id: e.id,
    type: e.type,
    detail: e.detail,
    path: e.path,
    time: formatTime(e.createdAt),
  }));
}

/** 项目最近一条进度事件（首页“最近活动”用） */
export async function getProjectRecentEvent(projectId: string) {
  const ev = await prisma.progressEvent.findFirst({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  if (!ev) return null;
  return { id: ev.id, type: ev.type, detail: ev.detail, time: formatTime(ev.createdAt) };
}

/** 任务产物命中状态（展开区“还缺什么”）：文件存在性检查（不管 mtime，只回答“有没有”） */
export async function getTaskArtifactStatus(taskId: string) {  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t) throw new Error("任务不存在");
  const project = t.projectId ? await prisma.project.findUnique({ where: { id: t.projectId } }) : null;
  const root = (project?.folderPath ?? "").trim();
  const arts = parseArtifactsJson(t.artifacts);
  if (arts.length === 0) {
    return { root, artifacts: [] };
  }
  const files = root && fs.existsSync(root) ? walkProject(root) : [];
  const artifacts = arts.map((art) => {
    const hitRel = files.find((rel) => artifactMatches(art, rel));
    return {
      type: art.type,
      path: art.path ?? art.pattern ?? "",
      matched: !!hitRel,
      mtime: hitRel ? fileMtimeMs(path.join(root, hitRel)) : null,
    };
  });
  return { root, artifacts };
}

/** 项目实际文件列表（“从实际文件反选”用）：walkProject 结果，目录优先排序，最多 800 条 */
export async function listProjectFiles(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("项目不存在");
  const root = (project.folderPath ?? "").trim();
  if (!root || !fs.existsSync(root)) return { root: "", files: [] };
  const files = walkProject(root);
  // 排序：根目录文件最前 → 普通目录文件 → 隐藏（. 开头）目录文件最后；同层按字母
  files.sort((a, b) => {
    const rank = (f: string) => {
      if (!f.includes("/")) return 0; // 根文件
      const first = f.split("/")[0];
      return first.startsWith(".") ? 2 : 1;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  return { root, files: files.slice(0, 1200) };
}

/** 开发活动统计（日报/周报用）：since 之后的产物更新 / 确认完成事件摘要 */
export async function getDevActivity(since: Date) {
  const events = await prisma.progressEvent.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { type: true, detail: true, path: true, createdAt: true, task: { select: { title: true, project: { select: { name: true } } } } },
  });
  const matched = events.filter((e) => e.type === "artifact_matched");
  const confirmed = events.filter((e) => e.type === "confirmed");
  const uniquePaths = Array.from(new Set(matched.map((e) => e.path).filter(Boolean)));
  return {
    updatedPaths: uniquePaths.slice(0, 12),
    updateCount: matched.length,
    confirmedTasks: Array.from(new Set(confirmed.map((e) => e.task?.title ?? ""))).filter(Boolean).slice(0, 10),
    projects: Array.from(new Set(events.map((e) => e.task?.project?.name).filter(Boolean))) as string[],
  };
}

/** 进度感知统计（验证期出口标准）：产物命中率 + 路径修正次数 */
export async function getSenseStats() {
  const [tasks, events] = await Promise.all([
    prisma.task.findMany({ select: { artifacts: true } }),
    prisma.progressEvent.findMany({ select: { type: true, path: true } }),
  ]);
  let total = 0;
  for (const t of tasks) total += parseArtifactsJson(t.artifacts).length;
  const matchedPaths = new Set(
    events.filter((e) => e.type === "artifact_matched" && e.path).map((e) => normalizeRel(e.path)),
  );
  const pathFixes = events.filter((e) => e.type === "manual").length;
  const matched = matchedPaths.size;
  return {
    totalArtifacts: total,
    matchedArtifacts: matched,
    hitRate: total > 0 ? Math.round((matched / total) * 100) : 0,
    pathFixes,
  };
}
