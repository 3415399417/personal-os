import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
const API_KEY = process.env.DSH_DEEPSEEK_KEY;

/** 晨间启动：AI 一句提醒（轻量，聚合今日状态生成 1-2 句建议） */
export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: "未配置 DSH_DEEPSEEK_KEY" }, { status: 500 });
  }
  // 每日自动备份：距上次备份超过 24h 就备份一次（静默，失败不影响提示）
  try {
    const dbPath = path.join(process.cwd(), "dev.db");
    const dir = path.join(process.cwd(), "backup");
    if (fs.existsSync(dbPath)) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const files = fs.readdirSync(dir).filter((f) => /^dev-\d{14}\.db$/.test(f)).sort();
      const latest = files.length ? fs.statSync(path.join(dir, files[files.length - 1])).mtimeMs : 0;
      if (Date.now() - latest > 86400000) {
        const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        fs.copyFileSync(dbPath, path.join(dir, `dev-${stamp}.db`));
      }
    }
  } catch {
    /* 备份失败不影响晨间提示 */
  }
  try {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [todayTasks, carryover, focusProj, doneYesterday] = await Promise.all([
      prisma.task.findMany({ where: { createdAt: { gte: dayStart } }, select: { title: true, status: true, group: true } }),
      prisma.task.findMany({
        where: { status: { not: "completed" }, createdAt: { lt: dayStart } },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        take: 3,
        select: { title: true, group: true },
      }),
      prisma.project.findFirst({ where: { isTodayFocus: true }, select: { name: true } }),
      prisma.task.count({
        where: { status: "completed", completedAt: { gte: dayStart } },
      }),
    ]);

    const pending = todayTasks.filter((t) => t.status !== "completed");
    const must = pending.filter((t) => t.group === "must").map((t) => t.title).slice(0, 3);
    const carry = carryover.map((t) => t.title).slice(0, 3);

    const prompt = `你是个人效率助手。根据以下今日状态，用一句话（40 字以内）给出行动建议，语气自然、有温度，不要用感叹号和列表：
今日新任务 ${todayTasks.length} 个（未完成 ${pending.length}）；必须完成：${must.join("、") || "无"}；昨日遗留：${carry.join("、") || "无"}；今日已完成 ${doneYesterday} 件；${focusProj ? `今日焦点项目：${focusProj.name}` : "今日未设焦点项目"}。`;

    const res = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 120,
        temperature: 0.8,
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const json = await res.json();
    const text = (json?.choices?.[0]?.message?.content ?? "").trim();
    return NextResponse.json({ ok: true, hint: text });
  } catch (err) {
    console.error("[api/start-hint] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
