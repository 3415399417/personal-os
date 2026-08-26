// 进度感知引擎：项目文件扫描 / 产物匹配 / 进度事件 / 卡住判定
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { artifactMatches, fileMtimeMs, normalizeRel, walkProject } from "@/lib/artifact-matcher";
import type { Artifact } from "@/lib/artifact-matcher";
import { calcProgress, formatTime, parseArtifacts, parseArtifactsJson, serializeArtifacts, toTask, EVENT_MAX_PER_TASK, ARTIFACT_TYPES } from "./commons";
import { syncProjectProgress } from "./tasks";

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
export async function migrateTaskArtifactsBatch(tasks: { id: string; artifacts: string; description: string }[]) {
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

