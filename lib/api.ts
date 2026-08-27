// 数据访问接口层（客户端）：函数签名保持不变，组件层零改动。
// 实现：内部通过 POST /api/data 调用服务端（服务端持有 Prisma + SQLite）。
// Phase 2 换 Postgres 只需改服务端 app/api/data/route.ts。
import type {
  Asset,
  ConversationMessage,
  DashboardData,
  FrictionLogItem,
  InboxItem,
  LearningRecord,
  Note,
  ProgressEventItem,
  Project,
  Reminder,
  Review,
  SidebarTodo,
  Task,
  TaskGroup,
} from "@/types";

async function call<T>(action: string, payload?: unknown): Promise<T> {
  const resp = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  let d: { ok?: boolean; data?: T; error?: string } | null = null;
  try {
    d = await resp.json();
  } catch {
    /* ignore */
  }
  if (!resp.ok || !d?.ok) {
    throw new Error(d?.error || `操作失败 (HTTP ${resp.status})`);
  }
  return d.data as T;
}

/* ── 首页 Dashboard ── */

export function getDashboard(): Promise<DashboardData> {
  return call<DashboardData>("getDashboard");
}

export function getTodos(): Promise<SidebarTodo[]> {
  return call<SidebarTodo[]>("getTodos");
}

export function createTodo(text: string): Promise<SidebarTodo> {
  return call<SidebarTodo>("createTodo", { text });
}

export function toggleTodo(id: string, done: boolean): Promise<void> {
  return call<void>("toggleTodo", { id, done });
}

export function deleteTodo(id: string): Promise<void> {
  return call<void>("deleteTodo", { id });
}

export function getNotifications(): Promise<{ id: string; title: string; meta: string }[]> {
  return call("getNotifications");
}

/* ── 通知中心 ── */

export interface BellNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export function getNotificationsForBell(): Promise<{ unreadCount: number; items: BellNotification[] }> {
  return call("getNotificationsForBell");
}

export function createNotification(input: { type: string; title: string; body?: string }): Promise<void> {
  return call("createNotification", input);
}

export function deleteNotification(id: string): Promise<void> {
  return call("deleteNotification", { id });
}

export function clearAllNotifications(): Promise<void> {
  return call("clearAllNotifications");
}

/* ── /today ── */

export function getTodayTasks(): Promise<Task[]> {
  return call<Task[]>("getTodayTasks");
}

export function createTask(input: { title: string; group?: TaskGroup; projectId?: string }): Promise<Task> {
  return call<Task>("createTask", input);
}

export function toggleTask(id: string, done: boolean): Promise<void> {
  return call<void>("toggleTask", { id, done });
}

export function updateTaskStatus(id: string, status: string): Promise<void> {
  return call<void>("updateTaskStatus", { id, status });
}

export function setTaskFocus(id: string, isFocus: boolean): Promise<void> {
  return call<void>("setTaskFocus", { id, isFocus });
}

export function setProjectFocus(id: string, isFocus: boolean): Promise<void> {
  return call<void>("setProjectFocus", { id, isFocus });
}

export function deleteTask(id: string): Promise<void> {
  return call<void>("deleteTask", { id });
}

/* ── /projects ── */

export function getProjects(): Promise<Project[]> {
  return call<Project[]>("getProjects");
}

export function getProject(id: string): Promise<Project | null> {
  return call<Project | null>("getProject", { id });
}

export function createProject(input: { name: string; desc?: string; status?: string }): Promise<Project> {
  return call<Project>("createProject", input);
}

export function updateProject(
  id: string,
  patch: { name?: string; desc?: string; status?: string; folderPath?: string },
): Promise<Project | null> {
  return call<Project | null>("updateProject", { id, patch });
}

export function deleteProject(id: string): Promise<void> {
  return call<void>("deleteProject", { id });
}

/* ── 文档孵化（AI 读开发文档 → 生成项目计划） ── */

export interface IncubateArtifact {
  type: "file" | "folder" | "glob";
  path?: string;
  pattern?: string;
}

export interface IncubateTask {
  title: string;
  description: string;
  group: "must" | "waiting";
  artifacts: IncubateArtifact[];
}

export interface IncubatePlan {
  name: string;
  description: string;
  tasks: IncubateTask[];
}

/** 文档孵化：解析开发文档 → 生成计划（不落库，仅预览）+ 推荐关联资产（指令/模板） */
export async function incubatePlan(docText: string): Promise<{
  plan: IncubatePlan;
  assets: { commands: { id: string; name: string; description: string }[]; templates: { id: string; name: string; description: string }[] };
}> {
  const resp = await fetch("/api/incubate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docText }),
  });
  const d = await resp.json();
  if (!resp.ok || !d.ok) {
    throw new Error(d?.error ?? `HTTP ${resp.status}`);
  }
  return { plan: d.plan as IncubatePlan, assets: d.assets ?? { commands: [], templates: [] } };
}

/** 文档孵化：确认计划 → 事务创建项目 + 任务（返回项目，含新 id）；resources 为勾选的关联资产 id */
export function createProjectWithTasks(input: {
  name: string;
  desc?: string;
  folderPath?: string;
  tasks?: { title: string; description?: string; group?: TaskGroup; artifacts?: IncubateArtifact[] }[];
  resources?: string[];
}): Promise<{ project: Project; tasks: Task[] }> {
  return call<{ project: Project; tasks: Task[] }>("createProjectWithTasks", input);
}

/* ── 进度感知（第二期）：扫描 / 确认 / 产物编辑 / 事件 ── */

export interface ScanResult {
  skipped?: "no_folder";
  changed: { taskId: string; title: string; status: string; readyForConfirm: boolean }[];
  events: { taskId: string; type: string; detail: string; path: string }[];
}

/** 扫描项目文件夹：文件变化命中产物 → 更新任务状态（幂等） */
export function scanProject(projectId: string): Promise<ScanResult> {
  return call<ScanResult>("scanProject", { projectId });
}

/** 手动修正任务产物路径 */
export function updateTaskArtifacts(taskId: string, artifacts: IncubateArtifact[]): Promise<Task | null> {
  return call<Task | null>("updateTaskArtifacts", { taskId, artifacts });
}

/** 确认任务完成（需 readyForConfirm，或 force 强制） */
export function confirmTask(taskId: string, force = false): Promise<{ task: Task | null; event: unknown }> {
  return call<{ task: Task | null; event: unknown }>("confirmTask", { taskId, force });
}

/** 任务完成依据时间线 */
export function getProgressEvents(taskId: string): Promise<ProgressEventItem[]> {
  return call<ProgressEventItem[]>("getProgressEvents", { taskId });
}

/** 任务产物命中状态（展开区“还缺什么”） */
export interface ArtifactStatusItem {
  type: string;
  path: string;
  matched: boolean;
  mtime: number | null;
}

export function getTaskArtifactStatus(taskId: string): Promise<{ root: string; artifacts: ArtifactStatusItem[] }> {
  return call("getTaskArtifactStatus", { taskId });
}

/** 项目实际文件列表（“从实际文件反选”用） */
export function listProjectFiles(projectId: string): Promise<{ root: string; files: string[] }> {
  return call("listProjectFiles", { projectId });
}

/* ── /notes ── */

export function getNotes(): Promise<Note[]> {
  return call<Note[]>("getNotes");
}

export function createNote(input: { title: string; content: string; type?: string; projectId?: string }): Promise<Note> {
  return call<Note>("createNote", input);
}

export function deleteNote(id: string): Promise<void> {
  return call<void>("deleteNote", { id });
}

export function updateNote(id: string, patch: { title?: string; content?: string; type?: string }): Promise<Note | null> {
  return call<Note | null>("updateNote", { id, patch });
}

/** 笔记挂靠到项目（孤儿档案一键归属）；projectId 传 null 解除 */
export function attachNoteToProject(noteId: string, projectId: string | null): Promise<Note | null> {
  return call<Note | null>("attachNoteToProject", { noteId, projectId });
}

/* ── /learning ── */

export function getLearningRecords(): Promise<LearningRecord[]> {
  return call<LearningRecord[]>("getLearningRecords");
}

/** 本周新增笔记（学习中心「本周沉淀」用） */
export function getWeekNotes(): Promise<{ id: string; title: string; type: string; time: string }[]> {
  return call("getWeekNotes");
}

export function createLearningRecord(input: { title: string; content?: string; progress?: number }): Promise<LearningRecord> {
  return call<LearningRecord>("createLearningRecord", input);
}

export function deleteLearningRecord(id: string): Promise<void> {
  return call<void>("deleteLearningRecord", { id });
}

/* ── /review ── */

export function getReviews(): Promise<Review[]> {
  return call<Review[]>("getReviews");
}

export function createReview(input: {
  period?: string;
  summary: string;
  wins?: string;
  losses?: string;
  next?: string;
  title?: string;
}): Promise<Review> {
  return call<Review>("createReview", input);
}

export function deleteReview(id: string): Promise<void> {
  return call<void>("deleteReview", { id });
}

/* ── /inbox ── */

export function getInboxItems(): Promise<InboxItem[]> {
  return call<InboxItem[]>("getInboxItems");
}

export function createInboxItem(input: { text: string; source?: string }): Promise<InboxItem> {
  return call<InboxItem>("createInboxItem", input);
}

export function markInboxHandled(id: string, handled: boolean): Promise<void> {
  return call<void>("markInboxHandled", { id, handled });
}

export function deleteInboxItem(id: string): Promise<void> {
  return call<void>("deleteInboxItem", { id });
}

/** 资源中心卡片：新建资源条目（url 供领域库存链接，projectId 关联项目） */
export function createResourceEntry(input: { name: string; type?: string; description?: string; url?: string; projectId?: string | null }): Promise<{ id: string; name: string; type: string; time: string }> {
  return call("createResourceEntry", input);
}

/** 资源中心卡片：删除指定类型最近一条资源，返回被删条目名 */
export function deleteLatestResourceEntry(type: string): Promise<{ deleted: string } | null> {
  return call("deleteLatestResourceEntry", { type });
}

/** 按类型查资源（领域库/知识库/指令库/模板库子页面） */
export function getResources(type: string): Promise<{ id: string; name: string; description: string; url: string; time: string; projectId: string | null; projectName: string }[]> {
  return call("getResources", { type });
}

/** 按 id 删除资源条目 */
export function deleteResource(id: string): Promise<void> {
  return call("deleteResource", { id });
}

/** 项目关联资源（项目详情页“关联资产”区块） */
export function getProjectResources(projectId: string): Promise<{ id: string; name: string; description: string; type: string; time: string }[]> {
  return call("getProjectResources", { projectId });
}

/** 解绑资源与项目 */
export function clearResourceProject(id: string): Promise<void> {
  return call("clearResourceProject", { id });
}

/** 扫描 E:\我的项目 历史项目目录（导入用） */
export function scanProjectsDir(): Promise<{ name: string; folderPath: string; imported: boolean }[]> {
  return call("scanProjectsDir");
}

/** 批量导入历史项目（只登记项目 + folderPath，不建任务） */
export function importProjects(inputs: { name: string; folderPath: string; status?: string }[]): Promise<Project[]> {
  return call("importProjects", { inputs });
}

/** AI 生成项目档案：扫描 README/文档 → 总结存为关联项目的笔记 */
export function generateProjectArchive(projectId: string): Promise<{ id: string; title: string; type: string; time: string }> {
  return call("generateProjectArchive", { projectId });
}

/** AI 生成项目复盘（导入历史项目自动沉淀用；已有同名则跳过） */
export function generateProjectReview(projectId: string): Promise<{ id: string; title: string; skipped?: boolean }> {
  return call("generateProjectReview", { projectId });
}

/** 项目时间线（聚合该项目所有任务的进度事件） */
export function getProjectTimeline(projectId: string): Promise<{ id: string; type: string; detail: string; taskTitle: string; time: string }[]> {
  return call("getProjectTimeline", { projectId });
}

/** 摩擦日志：记一条卡点 */
export function createFrictionLog(input: { content: string; taskId?: string; projectId?: string }): Promise<FrictionLogItem> {
  return call<FrictionLogItem>("createFrictionLog", input);
}

/** 摩擦日志：查询（按任务/项目/近 N 天） */
export function getFrictionLogs(input?: { taskId?: string; projectId?: string; days?: number; limit?: number }): Promise<FrictionLogItem[]> {
  return call<FrictionLogItem[]>("getFrictionLogs", input ?? {});
}

export function deleteFrictionLog(id: string): Promise<void> {
  return call<void>("deleteFrictionLog", { id });
}

/* ── /assets ── */

export function getAssets(): Promise<Asset[]> {
  return call<Asset[]>("getAssets");
}

/** 项目关联的长期资产（项目详情页用） */
export function getProjectAssets(projectId: string): Promise<Asset[]> {
  return call<Asset[]>("getProjectAssets", { projectId });
}

export function createAsset(input: { title: string; content: string; kind: string; projectId?: string }): Promise<Asset> {
  return call<Asset>("createAsset", input);
}

export function updateAsset(
  id: string,
  patch: { title?: string; content?: string; kind?: string; projectId?: string | null },
): Promise<Asset | null> {
  return call<Asset | null>("updateAsset", { id, patch });
}

export function deleteAsset(id: string): Promise<void> {
  return call<void>("deleteAsset", { id });
}

/* ── /ai ── */

export function getReminders(): Promise<Reminder[]> {
  return call<Reminder[]>("getReminders");
}

export function createReminder(input: { title: string; content?: string; remindAt?: string }): Promise<Reminder> {
  return call<Reminder>("createReminder", input);
}

export function updateReminderStatus(id: string, status: string): Promise<void> {
  return call<void>("updateReminderStatus", { id, status });
}

export function deleteReminder(id: string): Promise<void> {
  return call<void>("deleteReminder", { id });
}

export function getConversation(): Promise<ConversationMessage[]> {
  return call<ConversationMessage[]>("getConversation");
}

export function getAiQuickReplies(): Promise<string[]> {
  return call<string[]>("getAiQuickReplies");
}

export function saveAiExchange(userText: string, assistantText: string): Promise<void> {
  return call<void>("saveAiExchange", { userText, assistantText });
}

export function clearConversation(): Promise<void> {
  return call<void>("clearConversation");
}

export function getRecentCompletedTasks(days = 7): Promise<{ id: string; title: string; projectName: string; date: string }[]> {
  return call<{ id: string; title: string; projectName: string; date: string }[] | null>("getRecentCompletedTasks", { days }).then((r) => r ?? []);
}

export function getCarryoverTasks(limit = 3): Promise<{ id: string; title: string; group: string; projectName: string }[]> {
  return call<{ id: string; title: string; group: string; projectName: string }[] | null>("getCarryoverTasks", { limit }).then((r) => r ?? []);
}

export function getPlanStats(): Promise<{ createdToday: number; doneToday: number; carryover: number; total: number; rate: number }> {
  return call<{ createdToday: number; doneToday: number; carryover: number; total: number; rate: number }>("getPlanStats");
}

/* ── 个人资料（数据库，换浏览器不丢）── */

export interface UserProfile {
  name: string;
  role: string;
  focus: string;
  avatar: string;
}

export async function getProfile(): Promise<UserProfile> {
  const resp = await fetch("/api/profile", { method: "GET" });
  const d = await resp.json();
  if (!d?.ok) throw new Error(d?.error || "加载个人资料失败");
  return d.profile as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const resp = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const d = await resp.json();
  if (!d?.ok) throw new Error(d?.error || "保存个人资料失败");
  return d.profile as UserProfile;
}

/* ── 数据还原（备份恢复）── */

export interface BackupInfo {
  file: string;
  time: string;
  sizeKB: number;
}

export async function listBackups(): Promise<BackupInfo[]> {
  const resp = await fetch("/api/restore");
  const d = await resp.json();
  if (!d?.ok) throw new Error(d?.error || "加载备份列表失败");
  return d.backups as BackupInfo[];
}

export async function restoreBackup(file: string): Promise<{ note: string }> {
  const resp = await fetch("/api/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file }),
  });
  const d = await resp.json();
  if (!d?.ok) throw new Error(d?.error || "还原失败");
  return d;
}
