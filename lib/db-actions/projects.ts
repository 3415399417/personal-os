// 项目 CRUD + 批量导入 + 档案/复盘生成 + 时间线
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import type { Project } from "@/types";
import { calcProgress, formatTime, parseArtifactsJson, serializeArtifacts, toProject, toTask, STALLED_DAYS, TaskArtifact, GROUP_TO_STATUS, IncubateTaskInput } from "./commons";
import type { Task, TaskGroup } from "@/types";
import { migrateTaskArtifactsBatch } from "./progress";

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

/* ── 文档孵化：AI 计划 → 项目 + 任务批量创建（事务） ── */

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

