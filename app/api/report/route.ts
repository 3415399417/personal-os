import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as db from "@/lib/db-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
const API_KEY = process.env.DSH_DEEPSEEK_KEY;

function dayStart(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

/** 聚合数据：近 N 天完成任务 / 笔记 / 复盘 / 学习 */
async function collect(days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [tasks, notes, reviews, learnings, projects, createdToday, carryover, dev] = await Promise.all([
    prisma.task.findMany({
      where: { status: "completed", completedAt: { gte: since } },
      orderBy: { completedAt: "desc" },
      take: 30,
      select: { title: true, completedAt: true, project: { select: { name: true } } },
    }),
    prisma.note.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10, select: { title: true } }),
    prisma.review.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10, select: { period: true, summary: true } }),
    prisma.learningRecord.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10, select: { title: true } }),
    prisma.project.findMany({ select: { name: true, status: true } }),
    prisma.task.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.task.count({ where: { status: { not: "completed" }, createdAt: { lt: dayStart } } }),
    db.getDevActivity(since),
  ]);
  return { tasks, notes, reviews, learnings, projects, createdToday, carryover, dev };
}

function buildPrompt(period: "day" | "week", data: Awaited<ReturnType<typeof collect>>): string {
  const head =
    period === "day"
      ? `今天是 ${new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}，请生成今日工作日报`
      : `请生成本周工作周报（近 7 天）`;
  const taskLines = data.tasks.map((t) => `- ${t.title}${t.project?.name ? `（${t.project.name}）` : ""}`).join("\n") || "- 无";
  const noteLines = data.notes.map((n) => `- ${n.title}`).join("\n") || "- 无";
  const reviewLines = data.reviews.map((r) => `- ${r.period || "复盘"}：${(r.summary || "").slice(0, 50)}`).join("\n") || "- 无";
  const learnLines = data.learnings.map((l) => `- ${l.title}`).join("\n") || "- 无";
  const projLines = data.projects.map((p) => `${p.name}(${p.status})`).join("、") || "无";
  const doneToday = data.tasks.length;
  const planTotal = data.createdToday + data.carryover;
  const planRate = planTotal > 0 ? Math.round((doneToday / planTotal) * 100) : 0;
  const planLine = period === "day" ? `今日计划 ${data.createdToday} 项，昨日遗留 ${data.carryover} 项，已完成 ${doneToday} 项，计划完成率 ${planRate}%。` : `近 7 天共完成 ${doneToday} 项。`;
  const dev = data.dev;
  const devLine = dev && dev.updateCount > 0
    ? `检测到 ${dev.updateCount} 处产物更新（${dev.updatedPaths.slice(0, 8).join("、")}${dev.updatedPaths.length > 8 ? " 等" : ""}）${dev.confirmedTasks.length > 0 ? `，${dev.confirmedTasks.length} 个任务确认完成（${dev.confirmedTasks.slice(0, 5).join("、")}）` : ""}${dev.projects.length > 0 ? `，涉及项目：${dev.projects.join("、")}` : ""}`
    : "系统未检测到开发活动（可能是纯脑力/文档工作，或项目未关联文件夹）";
  return `${head}。基于以下数据生成一份简洁的中文总结，结构：\n一、完成情况（列出主要完成事项，最多 8 条；若系统检测到开发进展，在对应事项中自然提及，如“完成登录接口（检测到 src/api/auth.ts 更新）”）\n二、产出与沉淀（笔记/学习/复盘要点，最多 5 条）\n三、状态与建议（2-3 句，结合进行中的项目给出下一步建议）\n要求：真实引用数据，不要编造；总字数 200 字以内；用 Markdown 但不要用标题符号 #。\n\n【${period === "day" ? "今日计划" : "本周"}】\n${planLine}\n\n【开发进度（系统检测）】\n${devLine}\n\n【已完成任务】\n${taskLines}\n\n【新增笔记】\n${noteLines}\n\n【复盘】\n${reviewLines}\n\n【学习记录】\n${learnLines}\n\n【项目状态】\n${projLines}`;
}

export async function GET(req: Request) {
  const period = (new URL(req.url).searchParams.get("period") ?? "day") as "day" | "week";
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: "服务端未配置 DSH_DEEPSEEK_KEY" }, { status: 500 });
  }
  try {
    const days = period === "week" ? 7 : 1;
    const data = await collect(days);
    const prompt = buildPrompt(period, data);
    const res = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[api/report] llm failed:", res.status, t.slice(0, 200));
      return NextResponse.json({ ok: false, error: `LLM 调用失败 ${res.status}` }, { status: 502 });
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, period, text, stats: { tasks: data.tasks.length, notes: data.notes.length, reviews: data.reviews.length, learnings: data.learnings.length } });
  } catch (err) {
    console.error("[api/report] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
