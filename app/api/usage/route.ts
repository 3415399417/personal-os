import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 学习时长心跳：页面每 60s 报到一次；同一天内距上次心跳 <50s 则忽略（多标签去重） */
export async function POST() {
  try {
    const now = new Date();
    const key = todayKey();
    const prev = await prisma.dailyUsage.findUnique({ where: { date: key } });
    if (!prev || !prev.lastTickAt || now.getTime() - prev.lastTickAt.getTime() >= 50000) {
      // 累加实际间隔（上限 180s，防止页面休眠后恢复一次性补太多），首次按 60s 计
      const delta = prev?.lastTickAt ? Math.min(180, Math.round((now.getTime() - prev.lastTickAt.getTime()) / 1000)) : 60;
      await prisma.dailyUsage.upsert({
        where: { date: key },
        update: { seconds: { increment: delta }, lastTickAt: now },
        create: { date: key, seconds: delta, lastTickAt: now },
      });
      return NextResponse.json({ ok: true, delta });
    }
    return NextResponse.json({ ok: true, delta: 0 });
  } catch (err) {
    console.error("[api/usage] tick failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** 学习时长查询：最近 N 天 + 今日/本周合计 */
export async function GET(req: Request) {
  try {
    const days = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get("days") ?? 7)));
    const keys: string[] = [];
    for (let i = 0; i < days; i++) keys.push(todayKey(i));
    const rows = await prisma.dailyUsage.findMany({ where: { date: { in: keys } } });
    const byDate = new Map(rows.map((r) => [r.date, r.seconds]));
    const list = keys.map((k) => ({ date: k, seconds: byDate.get(k) ?? 0 })).reverse();
    const today = byDate.get(todayKey()) ?? 0;
    const week = list.reduce((s, r) => s + r.seconds, 0);
    return NextResponse.json({ ok: true, today, week, list });
  } catch (err) {
    console.error("[api/usage] get failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
