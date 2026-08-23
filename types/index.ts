// BetterLife Phase 1 数据模型（为 Phase 2 Prisma 预留；数据访问走 lib/api.ts）

/** 首页侧边栏待办（无分组概念的轻量待办） */
export interface SidebarTodo {
  id: string;
  text: string;
  done: boolean;
}

/** 今日任务分组 */
export type TaskGroup = "must" | "doing" | "waiting" | "done";

/** 任务产物（进度感知）：file=单个文件 / folder=目录 / glob=通配 */
export interface TaskArtifact {
  type: "file" | "folder" | "glob";
  path?: string; // file / folder 用
  pattern?: string; // glob 用
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  group: TaskGroup;
  projectId?: string;
  note?: string;
  isTodayFocus?: boolean;
  status?: string; // todo | doing | waiting | completed（运行时状态，感知引擎更新）
  artifacts?: TaskArtifact[];
  readyForConfirm?: boolean;
}

export interface ProgressEventItem {
  id: string;
  type: string; // artifact_matched | status_changed | confirmed | manual
  detail: string;
  path: string;
  time: string;
}

export type ProjectStatus = "进行中" | "待开始" | "已完成" | "暂停";

export interface Project {
  id: string;
  name: string;
  desc: string;
  progress: number; // 0-100
  status: ProjectStatus;
  stage: string;
  folderPath?: string; // 项目所在文件夹路径（可点击打开）
  isTodayFocus?: boolean; // 今日焦点（与任务焦点互斥）
  updatedAt: string;
  recentActivity?: { detail: string; time: string }; // 最近一条进度事件（首页“最近活动”）
  tasks: Task[];
  noteIds: string[];
}

export interface Note {
  id: string;
  title: string;
  content: string; // Markdown 原文
  type: string; // 类型筛选：复盘 / 读书笔记 / 客户分析 / 灵感 / 技术 / 其他
  time: string;
  projectId?: string;
}

export interface Resource {
  id: string;
  label: string;
  count: number;
  href?: string;
}

export interface Reminder {
  id: string;
  time: string;
  title: string;
  meta: string;
  remindAt?: string; // ISO
  dayLabel?: string; // 今天 / 明天 / MM-DD
  status?: string; // pending | done
}

export type LearningState = "进行中" | "待开始" | "已完成";

export interface LearningRecord {
  id: string;
  title: string;
  minutes: number;
  targetMinutes: number;
  state: LearningState;
  kind: string; // 阅读 / 英语 / 课程 / 技能 / 健康
  date: string;
}

export type AssetKind = "SOP" | "Prompt" | "Skill" | "项目记忆" | "复盘记录";

export interface Asset {
  id: string;
  kind: AssetKind;
  title: string;
  summary: string;
  time: string;
}

export interface Review {
  id: string;
  title: string;
  period: string;
  date: string;
  summary: string;
  wins: string[];
  losses: string[];
  next: string[];
}

export interface InboxItem {
  id: string;
  text: string;
  source: string; // 微信 / 语音 / 邮件 / 随手记
  time: string;
  handled: boolean;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  /** 推理模型的思考过程（assistant 消息可选） */
  reasoning?: string;
  /** AI 执行数据库工具后的轻量提示（如 "✓ 已创建任务「xxx」"） */
  toolNote?: string;
}

export interface ExecEntry {
  id: string;
  kind: "bolt" | "book" | "meeting" | "life";
  label: string;
  meta: string;
  count: number;
}

export interface LifeItem {
  id: string;
  kind: "heart" | "sun" | "bolt" | "book";
  label: string;
  meta: string;
  done?: boolean;
}

export interface QuickEntry {
  id: string;
  label: string;
  icon: "inbox" | "calendar" | "note" | "project" | "mic";
  href: string;
}

export interface StatCell {
  label: string;
  value: number;
}

export interface DashboardStats {
  feature: { value: number; label: string };
  cells: StatCell[];
}

export interface AssetSummary {
  id: string;
  label: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  execDone: number;
  execTotal: number;
  /** 今日执行卡片：左列分类计数（按 group）+ 右列状态计数（按 status） */
  execGroups: {
    cats: { must: number; doing: number; waiting: number }; // 左列：必须完成 / 进行中 / 等待处理
    stats: { done: number; doing: number; pending: number }; // 右列：已完成 / 进行中 / 待处理
  };
  projects: Project[];
  resources: Resource[];
  reminders: Reminder[];
  notes: { id: string; title: string; content: string; type: string; time: string }[];
  learning: {
    percent: number;
    learnedMinutes: number;
    targetMinutes: number;
    planCount: number;
    cardCount: number;
    activePlanCount: number; // 进行中的学习计划数
    activePlanProgress: number; // 进行中计划的平均进度 0-100
    reviewToday: number; // 今日复习知识卡片数（复习功能未做，暂为 0）
    reviewProgress: number; // 今日复习进度 0-100（复习功能未做，暂为 0）
    plans: LearningRecord[];
  };
  life: LifeItem[];
  quick: QuickEntry[];
  aiTags: string[];
  assets: AssetSummary[];
  focus: {
    kind: "task" | "project" | "none"; // 焦点形态：任务 / 项目 / 无
    eyebrow: string;
    tag: string;
    title: string;
    desc: string;
    source: string;
    stage: string;
    progress: number;
    mainTask: string;
    status: string;
    nextStep: string;
    projectId?: string; // 项目焦点时的项目 id（继续工作跳转用）
    done?: number; // 项目焦点：已完成任务数
    total?: number; // 项目焦点：总任务数
    focusHref?: string; // 焦点卡片主按钮跳转地址
  };
}
