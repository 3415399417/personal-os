// 笔记 + 摩擦日志 + 学习记录 + 复盘
import { prisma } from "@/lib/db";
import type { LearningRecord, Note, Review } from "@/types";
import { formatDate, formatTime, noteTypeLabel, noteTypeKey } from "./commons";

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

