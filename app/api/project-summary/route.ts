import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
const API_KEY = process.env.DSH_DEEPSEEK_KEY;

/** 项目完成总结：聚合项目任务/笔记，AI 生成 200 字总结 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "缺少项目 id" }, { status: 400 });
  if (!API_KEY) return NextResponse.json({ ok: false, error: "未配置 DSH_DEEPSEEK_KEY" }, { status: 500 });
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!project) return NextResponse.json({ ok: false, error: "项目不存在" }, { status: 404 });

    const done = project.tasks.filter((t) => t.status === "completed").length;
    const total = project.tasks.length;
    const taskLines = project.tasks.map((t) => `- ${t.title}${t.status === "completed" ? "（完成）" : ""}`).join("\n") || "- 无";
    const noteLines = project.notes.map((n) => `- ${n.title}`).join("\n") || "- 无";

    const prompt = `请为项目「${project.name}」写一份简洁的项目总结（200 字以内），结构：\n一、项目概述（1-2 句，根据名称和任务推断）\n二、完成情况（任务 ${done}/${total} 完成）\n三、沉淀成果（笔记要点）\n四、一句话复盘建议\n要求：真实引用任务名，不要编造细节；不要用 # 标题。\n\n【任务清单】\n${taskLines}\n\n【笔记】\n${noteLines}`;

    const res = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.5,
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const json = await res.json();
    const text = (json?.choices?.[0]?.message?.content ?? "").trim();
    return NextResponse.json({ ok: true, summary: text, done, total });
  } catch (err) {
    console.error("[api/project-summary] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
