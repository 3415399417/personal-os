import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 全站搜索：任务 / 项目 / 笔记 / 资源（LIKE 模糊匹配，各取前 5） */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ ok: true, q: "", results: { tasks: [], projects: [], notes: [], resources: [] } });
  }
  try {
    const [tasks, projects, notes, resources] = await Promise.all([
      prisma.task.findMany({
        where: { title: { contains: q } },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true },
      }),
      prisma.project.findMany({
        where: { name: { contains: q } },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, status: true },
      }),
      prisma.note.findMany({
        where: { OR: [{ title: { contains: q } }, { content: { contains: q } }] },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, type: true },
      }),
      prisma.resource.findMany({
        where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, type: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      q,
      results: {
        tasks: tasks.map((t) => ({ id: t.id, title: t.title, meta: t.status === "completed" ? "已完成" : "任务" })),
        projects: projects.map((p) => ({ id: p.id, title: p.name, meta: "项目" })),
        notes: notes.map((n) => ({ id: n.id, title: n.title, meta: "笔记" })),
        resources: resources.map((r) => ({ id: r.id, title: r.name, type: r.type, meta: r.type === "inbox" ? "收集箱" : r.type === "domain" ? "领域库" : r.type === "knowledge" ? "知识库" : r.type === "command" ? "指令库" : r.type === "template" ? "模板库" : "资源" })),
      },
    });
  } catch (err) {
    console.error("[api/search] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
