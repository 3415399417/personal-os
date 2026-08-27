import { NextResponse } from "next/server";
import { generateReportText } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 手动生成日报/周报文本（复盘页"生成日报/周报"按钮），只生成不落库，由用户决定是否存为复盘 */
export async function GET(req: Request) {
  const period = (new URL(req.url).searchParams.get("period") ?? "day") as "day" | "week";
  try {
    const text = await generateReportText(period);
    return NextResponse.json({ ok: true, period, text });
  } catch (err) {
    console.error("[api/report] failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
