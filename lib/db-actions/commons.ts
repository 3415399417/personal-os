// 公共工具：类型映射/时间格式化/进度计算/artifacts 序列化（无副作用，被各业务模块共享）
import type { Artifact } from "@/lib/artifact-matcher";
import type { Project, Reminder, Task, TaskGroup } from "@/types";

/* ── 工具 ── */

export const GROUP_TO_STATUS: Record<TaskGroup, string> = {
  must: "todo",
  doing: "doing",
  waiting: "waiting",
  done: "completed",
};

export const STATUS_TO_GROUP: Record<string, TaskGroup> = {
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

export function toReminder(r: { id: string; title: string; content: string; remindAt: Date | null; status?: string }): Reminder {
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

export const ASSET_TYPE_LABEL: Record<string, string> = {
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

export function noteTypeLabel(type: string): string {
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

export function noteTypeKey(type: string): string {
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

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

export const ARTIFACT_TYPES = ["file", "folder", "glob"];
export const EVENT_MAX_PER_TASK = 50;
export const STALLED_DAYS = 5; // 卡住判定：未完成 + 有产物 + 最近动静超过 N 天

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
