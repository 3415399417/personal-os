// /api/chat — DeepSeek function calling 工具循环
// 工具执行直连 lib/db-actions.ts（不经过 HTTP）；删除类工具必须先由用户确认。
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as db from "@/lib/db-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
const API_KEY = process.env.DSH_DEEPSEEK_KEY;

const MODELS: Record<string, string> = {
  flash: "deepseek-v4-flash",
  pro: "deepseek-v4-pro",
};

const EFFORTS: Record<string, string> = {
  low: "low",
  medium: "medium",
  high: "high",
};

const MAX_TOOL_ROUNDS = 8;

/* ── 工具定义（JSON Schema，OpenAI 兼容） ── */

const TOOLS = [
  // ── 查询 ──
  {
    type: "function",
    function: {
      name: "get_projects",
      description: "查询项目列表（含进度、状态、任务数）。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description:
        "查询任务列表。可按项目 id（project_id）、分组过滤（group: must|doing|waiting|done）、是否只看未完成（only_unfinished: true/false）。",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "项目 id，可选" },
          group: { type: "string", enum: ["must", "doing", "waiting", "done"], description: "分组，可选" },
          only_unfinished: { type: "boolean", description: "只看未完成任务，默认 false" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_notes",
      description: "查询笔记列表。可按类型过滤（type: 笔记|文档|提示词|学习|灵感|复盘|读书笔记|客户分析|模板）。",
      parameters: {
        type: "object",
        properties: { type: { type: "string", description: "笔记类型，可选" } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reviews",
      description: "查询复盘记录列表。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reminders",
      description: "查询提醒列表。",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_assets",
      description: "查询长期资产列表（SOP/Prompt/Skill/项目记忆/复盘记录）。可按类型过滤（kind）。",
      parameters: {
        type: "object",
        properties: { kind: { type: "string", description: "资产类型：SOP|Prompt|Skill|项目记忆|复盘记录，可选" } },
        required: [],
      },
    },
  },
  // ── 创建 ──
  {
    type: "function",
    function: {
      name: "create_project",
      description: "创建项目。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "项目名称" },
          description: { type: "string", description: "项目描述，可选" },
          status: { type: "string", enum: ["active", "paused", "completed", "archived"], description: "状态，默认 active（进行中）" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "创建任务。group: must（必须完成）| doing（进行中）| waiting（等待）| done（已完成）。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "任务标题" },
          group: { type: "string", enum: ["must", "doing", "waiting", "done"], description: "分组，默认 must" },
          project_id: { type: "string", description: "所属项目 id，可选" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "创建笔记（内容支持 Markdown）。type: 笔记|文档|提示词|学习|灵感|复盘。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "笔记标题" },
          content: { type: "string", description: "笔记内容（Markdown）" },
          type: { type: "string", description: "类型，默认 笔记" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_review",
      description: "创建复盘。period 如「2025年第35周」；wins/losses/next 为多行文本（每行一条）。",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "复盘周期，如 2025年第35周" },
          summary: { type: "string", description: "总结" },
          wins: { type: "string", description: "亮点，多行" },
          losses: { type: "string", description: "不足，多行" },
          next: { type: "string", description: "下一步，多行" },
        },
        required: ["summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_reminder",
      description: "创建提醒。remind_at 如「14:30」或 ISO 时间。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "提醒标题" },
          content: { type: "string", description: "提醒内容，可选" },
          remind_at: { type: "string", description: "提醒时间，如 14:30" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_asset",
      description: "创建长期资产。kind: SOP|Prompt|Skill|项目记忆|复盘记录。",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "资产标题" },
          content: { type: "string", description: "资产内容/摘要" },
          kind: { type: "string", description: "类型，默认 SOP" },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_friction_log",
      description: "记录一条摩擦日志（执行任务时遇到的卡点/问题/阻碍，供复盘使用）。如用户说「记一下：今天卡在 X 问题」时调用。",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "摩擦内容描述" },
          task_id: { type: "string", description: "关联任务 id，可选" },
          project_id: { type: "string", description: "关联项目 id，可选" },
        },
        required: ["content"],
      },
    },
  },
  // ── 修改 ──
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "更新任务完成状态（勾选/取消勾选）。",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "任务 id" },
          done: { type: "boolean", description: "true=标记完成，false=取消完成" },
        },
        required: ["task_id", "done"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_today_focus",
      description: "设置/取消今日最重要任务（is_focus: true=设为焦点）。",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "任务 id" },
          is_focus: { type: "boolean", description: "true=设为今日最重要" },
        },
        required: ["task_id", "is_focus"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description: "更新项目状态。status: active（进行中）| paused（暂停）| completed（已完成）| archived（归档）。",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", description: "项目 id" },
          status: { type: "string", enum: ["active", "paused", "completed", "archived"] },
        },
        required: ["project_id", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_note",
      description: "更新笔记标题或内容。",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "笔记 id" },
          title: { type: "string", description: "新标题，可选" },
          content: { type: "string", description: "新内容，可选" },
        },
        required: ["note_id"],
      },
    },
  },
  // ── 删除（必须确认） ──
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "删除任务。⚠️ 必须先向用户确认：「确认删除任务「xxx」吗？回复确认后执行」，用户明确同意后才能调用。",
      parameters: {
        type: "object",
        properties: { task_id: { type: "string", description: "任务 id" } },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_project",
      description: "删除项目（级联删除其任务）。⚠️ 必须先向用户确认：「确认删除项目「xxx」吗？回复确认后执行」，用户明确同意后才能调用。",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "项目 id" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_note",
      description: "删除笔记。⚠️ 必须先向用户确认：「确认删除笔记「xxx」吗？回复确认后执行」，用户明确同意后才能调用。",
      parameters: {
        type: "object",
        properties: { note_id: { type: "string", description: "笔记 id" } },
        required: ["note_id"],
      },
    },
  },
];

/* ── 上下文注入：按页面路径注入当前页数据摘要 ── */

async function buildPageContext(pathname?: string): Promise<string> {
  if (!pathname) return "";
  try {
    if (pathname === "/projects" || pathname.startsWith("/projects/")) {
      const projects = await db.getProjects();
      const lines = projects.map(
        (p) => `- ${p.name}（id: ${p.id}，状态: ${p.status}，进度: ${p.progress}%，任务 ${p.tasks.filter((t) => !t.done).length} 未完成）`,
      );
      return `【当前页面 /projects 数据摘要】\n${lines.length ? lines.join("\n") : "（暂无项目）"}`;
    }
    if (pathname === "/today") {
      const tasks = await db.getTodayTasks();
      const lines = tasks.map(
        (t) => `- ${t.text}（id: ${t.id}，分组: ${t.group}，完成: ${t.done ? "是" : "否"}${t.projectId ? `，项目: ${t.projectId}` : ""}）`,
      );
      return `【当前页面 /today 数据摘要】\n${lines.length ? lines.join("\n") : "（暂无任务）"}`;
    }
    if (pathname === "/notes") {
      const notes = await db.getNotes();
      const lines = notes.map((n) => `- ${n.title}（id: ${n.id}，类型: ${n.type}，时间: ${n.time}）`);
      return `【当前页面 /notes 数据摘要】\n${lines.length ? lines.join("\n") : "（暂无笔记）"}`;
    }
    if (pathname === "/review") {
      const reviews = await db.getReviews();
      const lines = reviews.map((r) => `- ${r.title}（id: ${r.id}，周期: ${r.period}）`);
      return `【当前页面 /review 数据摘要】\n${lines.length ? lines.join("\n") : "（暂无复盘）"}`;
    }
    if (pathname === "/inbox") {
      const items = await db.getInboxItems();
      const lines = items.map((i) => `- ${i.text}（id: ${i.id}，来源: ${i.source}，已处理: ${i.handled ? "是" : "否"}）`);
      return `【当前页面 /inbox 数据摘要】\n${lines.length ? lines.join("\n") : "（暂无收集箱条目）"}`;
    }
    if (pathname === "/assets") {
      const assets = await db.getAssets();
      const lines = assets.map((a) => `- ${a.title}（id: ${a.id}，类型: ${a.kind}）`);
      return `【当前页面 /assets 数据摘要】\n${lines.length ? lines.join("\n") : "（暂无资产）"}`;
    }
    if (pathname === "/learning") {
      const records = await db.getLearningRecords();
      const lines = records.map((r) => `- ${r.title}（id: ${r.id}，进度: ${r.minutes}/100，状态: ${r.state}）`);
      return `【当前页面 /learning 数据摘要】\n${lines.length ? lines.join("\n") : "（暂无学习计划）"}`;
    }
    if (pathname === "/" ) {
      const dash = await db.getDashboard();
      return `【首页数据摘要】\n项目数: ${dash.projects.length}，今日任务完成: ${dash.execDone}/${dash.execTotal}，今日最重要: ${dash.focus.title || "未设置"}`;
    }
    return "";
  } catch {
    return "";
  }
}

const BASE_SYSTEM = `你是 BetterLife AI Personal OS 的智能协作助手。
你可以通过工具真实地查询和操作数据库（项目/任务/笔记/复盘/提醒/资产/收集箱）。
规则：
1. 用户要求操作数据时，优先调用工具；工具结果就是真实数据，不要编造。
2. 用户问数据库里没有的信息，直接说"不知道"，禁止编造。
3. 删除类操作（delete_task/delete_project/delete_note）必须先用自然语言向用户确认：「确认删除「xxx」吗？回复确认后执行」，只有用户明确同意后才可以调用删除工具。
4. 回答简洁、结构化、可执行，用中文（除非用户用其他语言）。`;

/* ── 感知上下文注入：把进度感知引擎的实时状态告诉 AI（“系统看到了什么”） ── */

async function buildSenseContext(): Promise<string> {
  try {
    const [pendingTasks, doingTasks, recentEvents] = await Promise.all([
      prisma.task.findMany({
        where: { readyForConfirm: true, status: { not: "completed" } },
        select: { title: true, project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.task.findMany({
        where: { status: "doing", readyForConfirm: false },
        select: { title: true, project: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      prisma.progressEvent.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
        select: { type: true, createdAt: true, task: { select: { title: true } } },
      }),
    ]);

    const lines: string[] = [];
    if (pendingTasks.length) {
      lines.push(`待确认完成（产物已就位，等用户点确认）：${pendingTasks.map((t) => `「${t.title}」${t.project ? `(${t.project.name})` : ""}`).join("、")}`);
    }
    if (doingTasks.length) {
      lines.push(`开发中（检测到文件变化）：${doingTasks.map((t) => `「${t.title}」${t.project ? `(${t.project.name})` : ""}`).join("、")}`);
    }
    const matched24h = recentEvents.filter((e) => e.type === "artifact_matched").length;
    const confirmed24h = recentEvents.filter((e) => e.type === "confirmed").length;
    const act: string[] = [];
    if (matched24h) act.push(`${matched24h} 处产物更新`);
    if (confirmed24h) act.push(`${confirmed24h} 个任务确认完成`);
    if (act.length) lines.push(`最近 24 小时开发活动：${act.join("，")}`);

    if (!lines.length) return "";
    return `【开发进度感知（系统实时检测，非人工录入）】\n${lines.join("\n")}\n说明：以上是进度感知引擎检测到的实时状态；用户问"项目/任务现在什么情况"时优先引用，并提醒用户去确认待完成任务。`;
  } catch {
    return "";
  }
}

/* ── 资产感知注入：用户问题命中长期资产关键词时，自动带上相关内容 ── */

async function buildAssetContext(userText: string): Promise<string> {
  try {
    const t = (userText ?? "").trim();
    if (!t) return "";
    const words = [
      ...new Set(
        t.split(/[\s，。！？、,.!?;；:：'"“”‘’()（）\[\]【】<>《》/\\|_\-+=*#@~`^%&]+/).filter((w) => w.length >= 2),
      ),
    ];
    if (words.length === 0) return "";
    const assets = await prisma.asset.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });
    const hits: { title: string; type: string; content: string }[] = [];
    for (const a of assets) {
      const hay = `${a.title} ${a.type} ${a.content}`;
      if (words.some((w) => hay.includes(w))) {
        hits.push({ title: a.title, type: a.type, content: a.content.slice(0, 300) });
        if (hits.length >= 3) break;
      }
    }
    if (hits.length === 0) return "";
    const lines = hits.map((h) => `- 【${h.title}】(${h.type}) ${h.content}`);
    return `【相关长期资产（命中用户问题关键词，回答时优先参考复用）】\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

/* ── 工具执行（直连 DB，不走 HTTP） ── */

async function executeTool(name: string, args: any): Promise<{ result: unknown; notice?: string }> {
  switch (name) {
    case "get_projects": {
      const projects = await db.getProjects();
      return {
        result: projects.map((p) => ({
          id: p.id,
          name: p.name,
          desc: p.desc,
          status: p.status,
          progress: p.progress,
          task_count: p.tasks.length,
          unfinished_tasks: p.tasks.filter((t) => !t.done).length,
        })),
      };
    }
    case "get_tasks": {
      // 全部任务（个人 + 项目），支持 project_id 过滤——项目任务必须能查到
      const rows = await prisma.task.findMany({ orderBy: { createdAt: "asc" } });
      let tasks = rows.map((t) => ({
        id: t.id,
        title: t.title,
        group: t.group,
        done: t.status === "completed",
        status: t.status,
        ready_for_confirm: t.readyForConfirm,
        project_id: t.projectId,
      }));
      if (args.project_id) tasks = tasks.filter((t) => t.project_id === args.project_id);
      if (args.group) tasks = tasks.filter((t) => t.group === args.group);
      if (args.only_unfinished) tasks = tasks.filter((t) => !t.done);
      return {
        result: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          group: t.group,
          done: t.done,
          status: t.status,
          ready_for_confirm: t.ready_for_confirm,
          project_id: t.project_id ?? null,
        })),
      };
    }
    case "get_notes": {
      let notes = await db.getNotes();
      if (args.type) notes = notes.filter((n) => n.type === args.type);
      return {
        result: notes.map((n) => ({ id: n.id, title: n.title, type: n.type, time: n.time, project_id: n.projectId ?? null })),
      };
    }
    case "get_reviews": {
      const reviews = await db.getReviews();
      return { result: reviews.map((r) => ({ id: r.id, title: r.title, period: r.period, date: r.date, summary: r.summary })) };
    }
    case "get_reminders": {
      const reminders = await db.getReminders();
      return { result: reminders.map((r) => ({ id: r.id, title: r.title, time: r.time, meta: r.meta })) };
    }
    case "get_assets": {
      let assets = await db.getAssets();
      if (args.kind) assets = assets.filter((a) => a.kind === args.kind);
      return { result: assets.map((a) => ({ id: a.id, title: a.title, kind: a.kind, time: a.time })) };
    }

    case "create_project": {
      const p = await db.createProject({ name: args.name, desc: args.description, status: args.status });
      return { result: { id: p.id, name: p.name, status: p.status }, notice: `已创建项目「${p.name}」` };
    }
    case "create_task": {
      const t = await db.createTask({ title: args.title, group: args.group, projectId: args.project_id });
      return { result: { id: t.id, title: t.text, group: t.group }, notice: `已创建任务「${t.text}」` };
    }
    case "create_note": {
      const n = await db.createNote({ title: args.title, content: args.content, type: args.type });
      return { result: { id: n.id, title: n.title, type: n.type }, notice: `已创建笔记「${n.title}」` };
    }
    case "create_review": {
      const r = await db.createReview({
        period: args.period,
        summary: args.summary,
        wins: args.wins,
        losses: args.losses,
        next: args.next,
      });
      return { result: { id: r.id, title: r.title }, notice: `已创建复盘「${r.title}」` };
    }
    case "create_reminder": {
      const r = await db.createReminder({ title: args.title, content: args.content, remindAt: args.remind_at });
      return { result: { id: r.id, title: r.title, time: r.time }, notice: `已创建提醒「${r.title}」` };
    }
    case "create_asset": {
      const a = await db.createAsset({ title: args.title, content: args.content, kind: args.kind });
      return { result: { id: a.id, title: a.title, kind: a.kind }, notice: `已创建资产「${a.title}」` };
    }
    case "create_friction_log": {
      const f = await db.createFrictionLog({ content: args.content, taskId: args.task_id, projectId: args.project_id });
      return { result: { id: f.id }, notice: `已记录摩擦日志：${args.content.slice(0, 40)}${args.content.length > 40 ? "…" : ""}` };
    }

    case "update_task_status": {
      await db.updateTaskStatus(args.task_id, args.done ? "completed" : "todo");
      const task = (await db.getTodayTasks()).find((t) => t.id === args.task_id);
      return {
        result: { id: args.task_id, done: args.done },
        notice: task ? `已${args.done ? "完成" : "取消完成"}任务「${task.text}」` : `已更新任务状态`,
      };
    }
    case "set_today_focus": {
      await db.setTaskFocus(args.task_id, args.is_focus);
      const task = (await db.getTodayTasks()).find((t) => t.id === args.task_id);
      return {
        result: { id: args.task_id, is_focus: args.is_focus },
        notice: task ? `已${args.is_focus ? "设为" : "取消"}今日最重要：${task.text}` : "已更新今日焦点",
      };
    }
    case "update_project_status": {
      await db.updateProject(args.project_id, { status: args.status });
      const p = (await db.getProjects()).find((x) => x.id === args.project_id);
      return {
        result: { id: args.project_id, status: args.status },
        notice: p ? `已将项目「${p.name}」状态改为 ${args.status === "active" ? "进行中" : args.status === "paused" ? "暂停" : args.status === "completed" ? "已完成" : "归档"}` : "已更新项目状态",
      };
    }
    case "update_note": {
      const n = await db.updateNote(args.note_id, { title: args.title, content: args.content });
      return { result: { id: args.note_id, title: n?.title }, notice: n ? `已更新笔记「${n.title}」` : "已更新笔记" };
    }

    case "delete_task": {
      const task = (await db.getTodayTasks()).find((t) => t.id === args.task_id);
      if (!task) return { result: { error: `任务不存在: ${args.task_id}` } };
      await db.deleteTask(args.task_id);
      return { result: { deleted: args.task_id }, notice: `已删除任务「${task.text}」` };
    }
    case "delete_project": {
      const found = (await db.getProjects()).find((p) => p.id === args.project_id);
      if (!found) return { result: { error: `项目不存在: ${args.project_id}` } };
      await prisma.project.delete({ where: { id: args.project_id } });
      return { result: { deleted: args.project_id }, notice: `已删除项目「${found.name}」` };
    }
    case "delete_note": {
      const found = (await db.getNotes()).find((n) => n.id === args.note_id);
      if (!found) return { result: { error: `笔记不存在: ${args.note_id}` } };
      await prisma.note.delete({ where: { id: args.note_id } });
      return { result: { deleted: args.note_id }, notice: `已删除笔记「${found.title}」` };
    }

    default:
      return { result: { error: `未知工具: ${name}` } };
  }
}

/* ── 删除确认机制（无状态，基于对话历史） ── */

function lastUserText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return String(messages[i].content ?? "");
  }
  return "";
}

function isExplicitConfirm(text: string): boolean {
  const t = text.trim();
  // 明确同意词（短句）
  return /^(确认|确认删除|是的|对|好的|可以|同意|确定|删除吧|删吧|执行|就这么办|ok|y(es)?\b)/i.test(t) && t.length <= 30;
}

/** 用户最近消息明确确认 + 对话中此前确实发出过删除询问 */
function userConfirmedDeletion(messages: any[]): boolean {
  const lastUser = lastUserText(messages);
  if (!isExplicitConfirm(lastUser)) return false;
  const recent = messages
    .slice(-8)
    .map((m) => String(m.role === "tool" ? m.content : m.content ?? ""))
    .join(" ");
  return /确认删除|删除「|删除.*吗|needs_confirmation/.test(recent);
}

/* ── 主流程 ── */

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: "服务端未配置 DSH_DEEPSEEK_KEY" }, { status: 500 });
  }

  let body: { messages?: any[]; model?: string; effort?: string; pathname?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const model = MODELS[body.model ?? "flash"] ?? MODELS.flash;
  const effort = EFFORTS[body.effort ?? "medium"] ?? "medium";
  const pathname = typeof body.pathname === "string" ? body.pathname : "";

  if (messages.length === 0) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }

  const pageCtx = await buildPageContext(pathname);
  const senseCtx = await buildSenseContext();
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const assetCtx = await buildAssetContext(String(lastUser?.content ?? ""));
  const systemPrompt = `${BASE_SYSTEM}\n\n${pageCtx}\n${senseCtx}\n${assetCtx}`;

  const toolResults: { name: string; notice?: string }[] = [];
  let finalContent = "";
  let finalReasoning = "";
  let finalModel = model;
  let finalUsage: any = null;

  // 请求级幂等保护：同一轮对话内，相同工具+相同参数的重复调用直接跳过（模型偶发重复调用）
  const executedKeys = new Set<string>();

  try {
    let working = [...messages];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const upstream = await fetch(`${API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...working],
          max_tokens: 2048,
          reasoning_effort: effort,
          stream: false,
          tools: TOOLS,
        }),
        cache: "no-store",
      });

      if (!upstream.ok) {
        const detail = await upstream.text();
        console.error(`[api/chat] upstream ${upstream.status}: ${detail.slice(0, 300)}`);
        return NextResponse.json({ error: `上游 API 错误 ${upstream.status}` }, { status: 502 });
      }

      const data = await upstream.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) {
        return NextResponse.json({ error: "上游返回格式异常" }, { status: 502 });
      }
      finalModel = data.model;
      finalUsage = data.usage ?? null;
      finalReasoning = msg.reasoning_content ?? "";

      const toolCalls: any[] = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        finalContent = msg.content ?? "";
        break;
      }

      // 收集本轮工具调用（可并行）
      working.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });

      for (const tc of toolCalls) {
        const name = tc.function?.name;
        let args: any = {};
        try {
          args = JSON.parse(tc.function?.arguments ?? "{}");
        } catch {
          args = {};
        }

        // 请求级去重：相同工具 + 相同参数在本请求内已执行过 → 返回已执行提示，不再执行
        const key = `${name}|${JSON.stringify(args)}`;
        if (executedKeys.has(key)) {
          working.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ duplicate: true, message: "该操作已在本轮对话中执行过，无需重复执行。" }),
          });
          continue;
        }
        executedKeys.add(key);

          // 删除工具确认机制
        if (name === "delete_task" || name === "delete_project" || name === "delete_note") {
          // 找到目标名称
          let label = "";
          try {
            if (name === "delete_task") {
              const t = (await db.getTodayTasks()).find((x) => x.id === args.task_id);
              label = t?.text ?? "";
            } else if (name === "delete_project") {
              const p = (await db.getProjects()).find((x) => x.id === args.project_id);
              label = p?.name ?? "";
            } else {
              const n = (await db.getNotes()).find((x) => x.id === args.note_id);
              label = n?.title ?? "";
            }
          } catch {
            label = "";
          }
          const display = label || args.task_id || args.project_id || args.note_id || "该项目";
          const toolNameCn = name === "delete_task" ? "任务" : name === "delete_project" ? "项目" : "笔记";

          // 用户已明确确认（且对话中此前询问过）→ 执行
          if (userConfirmedDeletion(working)) {
            const { result, notice } = await executeTool(name, args);
            toolResults.push({ name, notice });
            working.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
          } else {
            // 未确认：让模型询问用户
            working.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({
                needs_confirmation: true,
                message: `删除${toolNameCn}「${display}」是不可恢复操作。请向用户确认：「确认删除${toolNameCn}「${display}」吗？回复确认后执行」。用户明确回复确认后再调用 ${name} 工具。`,
              }),
            });
          }
        } else {
          const { result, notice } = await executeTool(name, args);
          toolResults.push({ name, notice });
          working.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
      }
      // 继续下一轮（模型基于工具结果生成回复或再次调用）
    }

    if (!finalContent) {
      finalContent = "（已完成操作）";
    }

    return NextResponse.json({
      content: finalContent,
      reasoning: finalReasoning,
      model: finalModel,
      usage: finalUsage,
      toolResults: toolResults.filter((t) => t.notice),
    });
  } catch (err) {
    console.error("[api/chat] failed:", err);
    return NextResponse.json({ error: "调用 AI 服务失败" }, { status: 502 });
  }
}
