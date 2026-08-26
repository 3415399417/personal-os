// 收件箱 + 资源库 + 长期资产 + 提醒 + AI 对话 + 待办统计
import { prisma } from "@/lib/db";
import type { Asset, ConversationMessage, InboxItem, Reminder } from "@/types";
import { assetTypeKey, formatDate, formatTime, toReminder, ASSET_TYPE_LABEL } from "./commons";

export async function getInboxItems(): Promise<InboxItem[]> {
  const items = await prisma.resource.findMany({ where: { type: "inbox" }, orderBy: { createdAt: "desc" } });
  return items.map((i) => ({
    id: i.id,
    text: i.name,
    source: i.description || "随手记",
    time: formatTime(i.createdAt),
    handled: i.status === "handled",
  }));
}

export async function createInboxItem(input: { text: string; source?: string }): Promise<InboxItem> {
  const i = await prisma.resource.create({
    data: { name: input.text, type: "inbox", description: input.source ?? "随手记", status: "open" },
  });
  return {
    id: i.id,
    text: i.name,
    source: i.description || "随手记",
    time: formatTime(i.createdAt),
    handled: false,
  };
}

export async function markInboxHandled(id: string, handled: boolean): Promise<void> {
  await prisma.resource.update({ where: { id }, data: { status: handled ? "handled" : "open" } });
}

/* ── 通用资源条目（资源中心卡片用；type: inbox/domain/template 等） ── */

/** 按类型查资源（领域库/知识库/指令库/模板库等子页面用） */
export async function getResources(type: string): Promise<{ id: string; name: string; description: string; url: string; time: string; projectId: string | null; projectName: string }[]> {
  const rows = await prisma.resource.findMany({
    where: { type },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    url: r.url ?? "",
    time: formatTime(r.createdAt),
    projectId: r.projectId ?? null,
    projectName: r.project?.name ?? "",
  }));
}

/** 项目关联资源（项目详情页“关联资产”区块）：按类型分组 */
export async function getProjectResources(projectId: string) {
  const rows = await prisma.resource.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    type: r.type,
    time: formatTime(r.createdAt),
  }));
}

/** 解绑资源与项目（关联资产移除） */
export async function clearResourceProject(id: string): Promise<void> {
  await prisma.resource.update({ where: { id }, data: { projectId: null } });
}

/** 按 id 删除资源条目 */
export async function deleteResource(id: string): Promise<void> {
  await prisma.resource.delete({ where: { id } });
}

export async function createResourceEntry(input: {
  name: string;
  type?: string;
  description?: string;
  url?: string;
  projectId?: string | null;
}): Promise<{ id: string; name: string; type: string; time: string }> {
  const r = await prisma.resource.create({
    data: {
      name: input.name,
      type: input.type ?? "domain",
      description: input.description ?? "",
      url: input.url ?? "",
      projectId: input.projectId ?? null,
      status: "open",
    },
  });
  return { id: r.id, name: r.name, type: r.type, time: formatTime(r.createdAt) };
}

/** 删除指定类型的最近一条资源（资源中心卡片删除用），返回被删条目名 */
export async function deleteLatestResourceEntry(type: string): Promise<{ deleted: string } | null> {
  const latest = await prisma.resource.findFirst({
    where: { type },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return null;
  await prisma.resource.delete({ where: { id: latest.id } });
  return { deleted: latest.name };
}

/* ── 资产 ── */

export async function getAssets(): Promise<Asset[]> {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
  return assets.map((a) => ({
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
    projectId: a.projectId ?? undefined,
  }));
}

/** 项目关联的长期资产（项目详情页用） */
export async function getProjectAssets(projectId: string) {
  const rows = await prisma.asset.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((a) => ({
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
    projectId: a.projectId ?? undefined,
  }));
}

export async function updateAsset(
  id: string,
  patch: { title?: string; content?: string; kind?: string; projectId?: string | null },
): Promise<Asset | null> {
  const a = await prisma.asset.update({
    where: { id },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.kind !== undefined ? { type: assetTypeKey(patch.kind) } : {}),
      ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
    },
  });
  return {
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
    projectId: a.projectId ?? undefined,
  };
}

export async function createAsset(input: { title: string; content: string; kind: string; projectId?: string }): Promise<Asset> {
  const a = await prisma.asset.create({
    data: {
      title: input.title,
      content: input.content,
      type: assetTypeKey(input.kind),
      projectId: input.projectId ?? null,
    },
  });
  return {
    id: a.id,
    kind: (ASSET_TYPE_LABEL[a.type] ?? "SOP") as Asset["kind"],
    title: a.title,
    summary: a.content,
    time: formatDate(a.createdAt),
  };
}

/* ── 提醒 ── */

export async function getReminders(): Promise<Reminder[]> {
  const reminders = await prisma.reminder.findMany({ orderBy: { remindAt: "asc" } });
  return reminders.map(toReminder);
}

export async function createReminder(input: {
  title: string;
  content?: string;
  remindAt?: string; // "14:30" 或 ISO
}): Promise<Reminder> {
  let remindAt: Date | null = null;
  if (input.remindAt) {
    // 仅纯 HH:mm 视为当天时间；其余按完整日期/ISO 解析（ISO 也含冒号，不能靠 includes 判断）
    if (/^\d{1,2}:\d{2}$/.test(input.remindAt)) {
      const [h, m] = input.remindAt.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      remindAt = d;
    } else {
      remindAt = new Date(input.remindAt);
    }
  }
  const r = await prisma.reminder.create({
    data: { title: input.title, content: input.content ?? "", remindAt },
  });
  return toReminder(r);
}

export async function updateReminderStatus(id: string, status: string): Promise<void> {
  await prisma.reminder.update({ where: { id }, data: { status } });
}

export async function deleteReminder(id: string): Promise<void> {
  await prisma.reminder.delete({ where: { id } });
}

/* ── AI 会话 ── */

export async function getConversation(): Promise<ConversationMessage[]> {
  const conv = await prisma.aiConversation.findFirst({
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
  });
  if (!conv) return [];
  return conv.messages.map((m) => ({
    id: m.id,
    role: m.role as ConversationMessage["role"],
    text: m.content,
    time: formatTime(m.createdAt),
  }));
}

export async function saveAiExchange(userText: string, assistantText: string): Promise<void> {
  let conv = await prisma.aiConversation.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!conv) {
    conv = await prisma.aiConversation.create({
      data: { title: userText.slice(0, 20), contextType: "page" },
    });
  }
  await prisma.aiMessage.createMany({
    data: [
      { conversationId: conv.id, role: "user", content: userText },
      { conversationId: conv.id, role: "assistant", content: assistantText },
    ],
  });
  await prisma.aiConversation.update({
    where: { id: conv.id },
    data: {
      updatedAt: new Date(),
      title: conv.title === "新对话" ? userText.slice(0, 20) : conv.title,
    },
  });
}

export async function clearConversation(): Promise<void> {
  await prisma.aiMessage.deleteMany();
  await prisma.aiConversation.deleteMany();
}

/* ── 复盘闭环：最近完成的任务（供一键引用） ── */

export async function getRecentCompletedTasks(days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.task.findMany({
    where: { status: "completed", completedAt: { gte: since } },
    orderBy: { completedAt: "desc" },
    take: 20,
    select: { id: true, title: true, completedAt: true, projectId: true, project: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    projectName: r.project?.name ?? "",
    date: r.completedAt ? r.completedAt.toISOString().slice(0, 10) : "",
  }));
}

/* ── 晨间启动：昨日遗留任务（昨天及更早创建、未完成） ── */

export async function getCarryoverTasks(limit = 3) {
  const yesterdayStart = new Date();
  yesterdayStart.setHours(0, 0, 0, 0);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const rows = await prisma.task.findMany({
    where: { status: { not: "completed" }, createdAt: { lt: yesterdayStart } },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, title: true, group: true, projectId: true, project: { select: { name: true } } },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, group: r.group, projectName: r.project?.name ?? "" }));
}

/* ── 计划 vs 实际（今日统计） ── */

export async function getPlanStats() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [createdToday, doneToday, carryover] = await Promise.all([
    prisma.task.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.task.count({ where: { status: "completed", completedAt: { gte: dayStart } } }),
    prisma.task.count({ where: { status: { not: "completed" }, createdAt: { lt: dayStart } } }),
  ]);
  const total = createdToday + carryover;
  const rate = total > 0 ? Math.round((doneToday / total) * 100) : 0;
  return { createdToday, doneToday, carryover, total, rate };
}

/* ── 进度感知（第二期）：扫描 / 确认 / 产物编辑 / 事件流水 ── */

