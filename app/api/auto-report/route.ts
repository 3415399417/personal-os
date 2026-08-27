import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { autoKeyFor, autoTitleFor, generateReportText } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 自动日报/周报（幂等端点，服务端调度器专用）：
 * - 已生成过（autoKey 命中）→ skipped
 * - 否则 AI 生成 → 存复盘 + 站内通知
 * - Review.autoKey 唯一约束兜底并发，任何情况下每天最多一条
 */
export async function GET(req: Request) {
  const period = (new URL(req.url).searchParams.get("period") ?? "day") as "day" | "week";
  const key = autoKeyFor(period);
  try {
    const existing = await prisma.review.findUnique({ where: { autoKey: key } });
    if (existing) return NextResponse.json({ ok: true, skipped: true, title: existing.title });

    const text = await generateReportText(period);
    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "AI 生成内容为空" }, { status: 502 });
    }

    const title = autoTitleFor(period);
    const now = new Date();
    const review = await prisma.review.create({
      data: {
        title,
        period: `${now.getFullYear()}年${now.getMonth() + 1}月`,
        summary: text.trim(),
        autoKey: key,
      },
    });
    await prisma.notification.create({
      data: { type: "report_ready", title: `📊 ${title}已自动生成`, body: "见复盘页" },
    });
    return NextResponse.json({ ok: true, created: true, title, id: review.id });
  } catch (err) {
    // 并发兜底：唯一键冲突说明已有记录（另一请求先写入），视为跳过
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ ok: true, skipped: true });
    }
    console.error("[api/auto-report] failed:", err);
    return NextResponse.json({ ok: false, error: String((err as Error)?.message ?? err) }, { status: 500 });
  }
}
