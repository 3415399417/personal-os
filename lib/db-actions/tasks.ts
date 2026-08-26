// 任务 CRUD + 今日任务 + 焦点 + 项目进度同步
import { prisma } from "@/lib/db";
import type { Task, TaskGroup } from "@/types";
import { calcProgress, toTask, GROUP_TO_STATUS } from "./commons";

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

