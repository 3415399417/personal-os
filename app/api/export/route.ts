import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 导出全部数据为 JSON（下载附件） */
export async function GET() {
  try {
    const [tasks, projects, notes, resources, reminders, learnings, assets, reviews, conversations] = await Promise.all([
      prisma.task.findMany(),
      prisma.project.findMany(),
      prisma.note.findMany(),
      prisma.resource.findMany(),
      prisma.reminder.findMany(),
      prisma.learningRecord.findMany(),
      prisma.asset.findMany(),
      prisma.review.findMany(),
      prisma.aiConversation.findMany({ include: { messages: true } }),
    ]);
    const data = {
      exportedAt: new Date().toISOString(),
      version: 1,
      tasks,
      projects,
      notes,
      resources,
      reminders,
      learnings,
      assets,
      reviews,
      conversations,
    };
    const body = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="personal-os-backup-${date}.json"`,
      },
    });
  } catch (err) {
    console.error("[api/export] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
