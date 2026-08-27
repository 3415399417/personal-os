// 服务端数据 API：薄分发层，具体实现见 lib/db-actions/（/api/chat 工具调用共用）
// 风格约定：所有 action 有入参校验（SCHEMAS），成功返回 { ok: true, data }，失败返回 { ok: false, error } + 状态码
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as db from "@/lib/db-actions";
import {
  ApiValidationError,
  vArr,
  vBool,
  vId,
  vInt,
  vObj,
  vOptArr,
  vOptBool,
  vOptInt,
  vOptStr,
  vOptStrArr,
  vStr,
  vStrArr,
} from "@/lib/api-validation";

/** 每个 action 的入参白名单：校验 + 规范化，返回安全 payload */
const SCHEMAS: Record<string, (p: unknown) => any> = {
  // ── 待办（侧边栏） ──
  createTodo: (p: any) => ({ text: vStr(p?.text, "text") }),
  toggleTodo: (p: any) => ({ id: vId(p?.id), done: vBool(p?.done, "done") }),
  deleteTodo: (p: any) => ({ id: vId(p?.id) }),
  // ── 通知 ──
  createNotification: (p: any) => ({ type: vStr(p?.type, "type"), title: vStr(p?.title, "title"), body: vOptStr(p?.body, "body") }),
  deleteNotification: (p: any) => ({ id: vId(p?.id) }),
  // ── 任务 ──
  createTask: (p: any) => ({ title: vStr(p?.title, "title"), group: vOptStr(p?.group, "group"), projectId: vOptStr(p?.projectId, "projectId") }),
  toggleTask: (p: any) => ({ id: vId(p?.id), done: vBool(p?.done, "done") }),
  updateTaskStatus: (p: any) => ({ id: vId(p?.id), status: vStr(p?.status, "status") }),
  setTaskFocus: (p: any) => ({ id: vId(p?.id), isFocus: vBool(p?.isFocus, "isFocus") }),
  deleteTask: (p: any) => ({ id: vId(p?.id) }),
  getRecentCompletedTasks: (p: any) => ({ days: vOptInt(p?.days, "days") }),
  getCarryoverTasks: (p: any) => ({ limit: vOptInt(p?.limit, "limit") }),
  // ── 项目 ──
  getProject: (p: any) => ({ id: vId(p?.id) }),
  createProject: (p: any) => ({ name: vStr(p?.name, "name"), desc: vOptStr(p?.desc, "desc"), status: vOptStr(p?.status, "status"), folderPath: vOptStr(p?.folderPath, "folderPath") }),
  updateProject: (p: any) => ({ id: vId(p?.id), patch: vObj(p?.patch, "patch") }),
  createProjectWithTasks: (p: any) => ({ name: vStr(p?.name, "name"), desc: vOptStr(p?.desc, "desc"), folderPath: vOptStr(p?.folderPath, "folderPath"), tasks: vOptArr(p?.tasks, "tasks"), resources: vOptStrArr(p?.resources, "resources") }),
  setProjectFocus: (p: any) => ({ id: vId(p?.id), isFocus: vBool(p?.isFocus, "isFocus") }),
  deleteProject: (p: any) => ({ id: vId(p?.id) }),
  scanProject: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  listProjectFiles: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  importProjects: (p: any) => ({ inputs: vArr(p?.inputs, "inputs") }),
  generateProjectArchive: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  generateProjectReview: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  getProjectTimeline: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  getProjectRecentEvent: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  getProjectAssets: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  getProjectResources: (p: any) => ({ projectId: vId(p?.projectId, "projectId") }),
  // ── 进度感知 ──
  updateTaskArtifacts: (p: any) => ({ taskId: vId(p?.taskId, "taskId"), artifacts: vStr(p?.artifacts, "artifacts") }),
  confirmTask: (p: any) => ({ taskId: vId(p?.taskId, "taskId"), force: vOptBool(p?.force, "force") }),
  getProgressEvents: (p: any) => ({ taskId: vId(p?.taskId, "taskId") }),
  getTaskArtifactStatus: (p: any) => ({ taskId: vId(p?.taskId, "taskId") }),
  getDevActivity: (p: any) => ({ since: vOptStr(p?.since, "since") }),
  // ── 笔记 ──
  createNote: (p: any) => ({ title: vStr(p?.title, "title"), content: vOptStr(p?.content, "content"), type: vOptStr(p?.type, "type"), projectId: vOptStr(p?.projectId, "projectId") }),
  updateNote: (p: any) => ({ id: vId(p?.id), patch: vObj(p?.patch, "patch") }),
  deleteNote: (p: any) => ({ id: vId(p?.id) }),
  attachNoteToProject: (p: any) => ({ noteId: vId(p?.noteId, "noteId"), projectId: vOptStr(p?.projectId, "projectId") }),
  // ── 学习 ──
  createLearningRecord: (p: any) => ({ title: vStr(p?.title, "title"), content: vOptStr(p?.content, "content"), progress: vOptInt(p?.progress, "progress") }),
  deleteLearningRecord: (p: any) => ({ id: vId(p?.id) }),
  // ── 复盘 ──
  createReview: (p: any) => ({ title: vOptStr(p?.title, "title"), period: vOptStr(p?.period, "period"), summary: vStr(p?.summary, "summary"), wins: vOptStr(p?.wins, "wins"), losses: vOptStr(p?.losses, "losses"), next: vOptStr(p?.next, "next") }),
  deleteReview: (p: any) => ({ id: vId(p?.id) }),
  // ── 收集箱 / 资源 ──
  createInboxItem: (p: any) => ({ text: vStr(p?.text, "text"), source: vOptStr(p?.source, "source") }),
  markInboxHandled: (p: any) => ({ id: vId(p?.id), handled: vBool(p?.handled, "handled") }),
  deleteInboxItem: (p: any) => ({ id: vId(p?.id) }),
  createResourceEntry: (p: any) => ({ name: vStr(p?.name, "name"), type: vOptStr(p?.type, "type"), description: vOptStr(p?.description, "description"), url: vOptStr(p?.url, "url"), projectId: p?.projectId === null || p?.projectId === undefined ? undefined : vStr(p?.projectId, "projectId") }),
  deleteLatestResourceEntry: (p: any) => ({ type: vStr(p?.type, "type") }),
  getResources: (p: any) => ({ type: vStr(p?.type, "type") }),
  deleteResource: (p: any) => ({ id: vId(p?.id) }),
  clearResourceProject: (p: any) => ({ id: vId(p?.id) }),
  // ── 资产 ──
  createAsset: (p: any) => ({ title: vStr(p?.title, "title"), content: vStr(p?.content, "content"), kind: vStr(p?.kind, "kind"), projectId: vOptStr(p?.projectId, "projectId") }),
  updateAsset: (p: any) => ({ id: vId(p?.id), patch: vObj(p?.patch, "patch") }),
  deleteAsset: (p: any) => ({ id: vId(p?.id) }),
  // ── 提醒 ──
  createReminder: (p: any) => ({ title: vStr(p?.title, "title"), content: vOptStr(p?.content, "content"), remindAt: vOptStr(p?.remindAt, "remindAt") }),
  updateReminderStatus: (p: any) => ({ id: vId(p?.id), status: vStr(p?.status, "status") }),
  deleteReminder: (p: any) => ({ id: vId(p?.id) }),
  // ── 摩擦日志 ──
  createFrictionLog: (p: any) => ({ content: vStr(p?.content, "content"), taskId: vOptStr(p?.taskId, "taskId"), projectId: vOptStr(p?.projectId, "projectId") }),
  getFrictionLogs: (p: any) => ({ taskId: vOptStr(p?.taskId, "taskId"), projectId: vOptStr(p?.projectId, "projectId"), days: vOptInt(p?.days, "days"), limit: vOptInt(p?.limit, "limit") }),
  deleteFrictionLog: (p: any) => ({ id: vId(p?.id) }),
  // ── AI 会话 ──
  saveAiExchange: (p: any) => ({ userText: vStr(p?.userText, "userText"), assistantText: vStr(p?.assistantText, "assistantText") }),
};

type ActionFn = (payload: any) => Promise<unknown>;

const ACTIONS: Record<string, ActionFn> = {
  getDashboard: () => db.getDashboard(),
  getTodos: () => db.getTodos(),
  createTodo: (p) => db.createTodo(p.text),
  toggleTodo: (p) => db.toggleTodo(p.id, p.done),
  deleteTodo: (p) => prisma.task.delete({ where: { id: p.id } }),
  getNotifications: () => db.getNotifications(),
  getNotificationsForBell: () => db.getNotificationsForBell(),
  createNotification: (p) => db.createNotification(p),
  deleteNotification: (p) => db.deleteNotification(p.id),
  clearAllNotifications: () => db.clearAllNotifications(),
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
  getWeekNotes: () => db.getWeekNotes(),
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
  generateProjectArchive: (p) => db.generateProjectArchive(p.projectId),
  generateProjectReview: (p) => db.generateProjectReview(p.projectId),
  getProjectTimeline: (p) => db.getProjectTimeline(p.projectId),
  createFrictionLog: (p) => db.createFrictionLog(p),
  getFrictionLogs: (p) => db.getFrictionLogs(p ?? {}),
  deleteFrictionLog: (p) => db.deleteFrictionLog(p.id),
  attachNoteToProject: (p) => db.attachNoteToProject(p.noteId, p.projectId ?? null),
  getAssets: () => db.getAssets(),
  getProjectAssets: (p) => db.getProjectAssets(p.projectId),
  createAsset: (p) => db.createAsset(p),
  updateAsset: (p) => db.updateAsset(p.id, p.patch),
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
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const action = body.action;
  const fn = action ? ACTIONS[action] : undefined;
  if (!fn) {
    return NextResponse.json({ ok: false, error: `未知 action: ${action}` }, { status: 400 });
  }
  try {
    // 入参校验（无 schema 的 action 视为无参，忽略 payload）
    const schema = SCHEMAS[action!];
    const payload = schema ? schema(body.payload) : body.payload;
    const result = await fn(payload);
    return NextResponse.json({ ok: true, data: result ?? null });
  } catch (err) {
    if (err instanceof ApiValidationError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    console.error(`[api/data] ${action} failed:`, err);
    return NextResponse.json({ ok: false, error: `操作失败: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
