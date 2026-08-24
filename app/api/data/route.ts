// 服务端数据 API：薄分发层，具体实现见 lib/db-actions.ts（/api/chat 工具调用共用）
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as db from "@/lib/db-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: Record<string, (payload: any) => Promise<unknown>> = {
  getDashboard: () => db.getDashboard(),
  getTodos: () => db.getTodos(),
  createTodo: (p) => db.createTodo(p.text),
  toggleTodo: (p) => db.toggleTodo(p.id, p.done),
  deleteTodo: (p) => prisma.task.delete({ where: { id: p.id } }),
  getExecEntries: async () => [],
  getNotifications: () => db.getNotifications(),
  getTodayTasks: () => db.getTodayTasks(),
  createTask: (p) => db.createTask(p),
  toggleTask: (p) => db.toggleTask(p.id, p.done),
  updateTaskStatus: (p) => db.updateTaskStatus(p.id, p.status),
  setTaskFocus: (p) => db.setTaskFocus(p.id, p.isFocus),
  setProjectFocus: (p) => db.setProjectFocus(p.id, p.isFocus),
  deleteTask: (p) => db.deleteTask(p.id),
  getProjects: () => db.getProjects(),
  getProject: (p) => db.getProject(p.id),
  createProject: (p) => db.createProject(p),
  updateProject: (p) => db.updateProject(p.id, p.patch),
  createProjectWithTasks: (p) => db.createProjectWithTasks(p),
  scanProject: (p) => db.scanProject(p.projectId),
  updateTaskArtifacts: (p) => db.updateTaskArtifacts(p.taskId, p.artifacts),
  confirmTask: (p) => db.confirmTask(p.taskId, p.force),
  getProgressEvents: (p) => db.getProgressEvents(p.taskId),
  getProjectRecentEvent: (p) => db.getProjectRecentEvent(p.projectId),
  getTaskArtifactStatus: (p) => db.getTaskArtifactStatus(p.taskId),
  listProjectFiles: (p) => db.listProjectFiles(p.projectId),
  getDevActivity: (p) => db.getDevActivity(p.since ? new Date(p.since) : new Date(Date.now() - 86400000)),
  deleteProject: async (p) => {
    // 级联删除项目任务（与确认弹窗文案一致：任务一并删除），避免 SetNull 后混入个人待办
    await prisma.task.deleteMany({ where: { projectId: p.id } });
    await prisma.project.delete({ where: { id: p.id } });
  },
  getNotes: () => db.getNotes(),
  createNote: (p) => db.createNote(p),
  updateNote: (p) => db.updateNote(p.id, p.patch),
  deleteNote: (p) => prisma.note.delete({ where: { id: p.id } }),
  getLearningRecords: () => db.getLearningRecords(),
  createLearningRecord: (p) => db.createLearningRecord(p),
  deleteLearningRecord: (p) => prisma.learningRecord.delete({ where: { id: p.id } }),
  getReviews: () => db.getReviews(),
  createReview: (p) => db.createReview(p),
  deleteReview: (p) => prisma.review.delete({ where: { id: p.id } }),
  getRecentCompletedTasks: (p) => db.getRecentCompletedTasks(p?.days ?? 7),
  getCarryoverTasks: (p) => db.getCarryoverTasks(p?.limit ?? 3),
  getPlanStats: () => db.getPlanStats(),
  getInboxItems: () => db.getInboxItems(),
  createInboxItem: (p) => db.createInboxItem(p),
  markInboxHandled: (p) => db.markInboxHandled(p.id, p.handled),
  deleteInboxItem: (p) => prisma.resource.delete({ where: { id: p.id } }),
  createResourceEntry: (p) => db.createResourceEntry(p),
  deleteLatestResourceEntry: (p) => db.deleteLatestResourceEntry(p.type),
  getResources: (p) => db.getResources(p.type),
  deleteResource: (p) => db.deleteResource(p.id),
  getProjectResources: (p) => db.getProjectResources(p.projectId),
  clearResourceProject: (p) => db.clearResourceProject(p.id),
  scanProjectsDir: () => db.scanProjectsDir(),
  importProjects: (p) => db.importProjects(p.inputs),
  getAssets: () => db.getAssets(),
  createAsset: (p) => db.createAsset(p),
  deleteAsset: (p) => prisma.asset.delete({ where: { id: p.id } }),
  getReminders: () => db.getReminders(),
  createReminder: (p) => db.createReminder(p),
  updateReminderStatus: (p) => db.updateReminderStatus(p.id, p.status),
  deleteReminder: (p) => db.deleteReminder(p.id),
  getConversation: () => db.getConversation(),
  getAiQuickReplies: async () => ["整理今天的收集箱", "总结这篇文档", "制定明日计划", "复盘本周工作"],
  saveAiExchange: (p) => db.saveAiExchange(p.userText, p.assistantText),
  clearConversation: () => db.clearConversation(),
};

export async function POST(req: Request) {
  let body: { action?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const action = body.action;
  const fn = action ? ACTIONS[action] : undefined;
  if (!fn) {
    return NextResponse.json({ error: `未知 action: ${action}` }, { status: 400 });
  }
  try {
    const result = await fn(body.payload);
    return NextResponse.json(result ?? null);
  } catch (err) {
    console.error(`[api/data] ${action} failed:`, err);
    return NextResponse.json({ error: `操作失败: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
