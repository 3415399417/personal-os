import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSenseStats } from "@/lib/db-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 统计看板数据：近 7 天完成曲线 / 笔记产出 / 项目进度 / 生活语录 / 进度感知 */
export async function GET() {
  try {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);

    const [tasks, notes, projects, lifeNotes, sense] = await Promise.all([
      prisma.task.findMany({
        where: { status: "completed", completedAt: { gte: since } },
        select: { completedAt: true },
      }),
      prisma.note.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.project.findMany({ select: { name: true, status: true, progress: true } }),
      prisma.note.findMany({ where: { type: "life" }, orderBy: { createdAt: "desc" }, take: 10, select: { title: true, content: true, createdAt: true } }),
      getSenseStats(),
    ]);

    // 按天分组（含今天）
    const days: { date: string; label: string; done: number; notes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      days.push({ date: d.toISOString().slice(0, 10), label: key, done: 0, notes: 0 });
    }
    for (const t of tasks) {
      if (!t.completedAt) continue;
      const k = t.completedAt.toISOString().slice(0, 10);
      const day = days.find((x) => x.date === k);
      if (day) day.done++;
    }
    for (const n of notes) {
      const k = n.createdAt.toISOString().slice(0, 10);
      const day = days.find((x) => x.date === k);
      if (day) day.notes++;
    }

    const weekDone = days.reduce((s, d) => s + d.done, 0);
    const activeProjects = projects.filter((p) => p.status === "active").length;

    return NextResponse.json({
      ok: true,
      days,
      weekDone,
      weekNotes: days.reduce((s, d) => s + d.notes, 0),
      activeProjects,
      projects: projects
        .filter((p) => p.status !== "archived")
        .map((p) => ({ name: p.name, status: p.status, progress: p.status === "completed" ? 100 : p.progress })),
      lifeNotes: lifeNotes.map((n) => ({ date: n.title, content: n.content })),
      sense,
    });
  } catch (err) {
    console.error("[api/stats] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
