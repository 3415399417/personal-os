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
    const taskLines = project.tasks.map((t) => `- ${t.title}${t.status === "completed" ? "（完成）" : ""}`).join("\n") || "- 无任务列表";
    // 项目档案笔记全文优先作为素材（历史项目无任务时，档案是唯一真实依据）
    const archiveNote = project.notes.find((n) => n.title.includes("项目档案"));
    const noteLines = project.notes.map((n) => `- ${n.title}`).join("\n") || "- 无";
    const isCompleted = project.status === "completed";

    const prompt = `请为项目「${project.name}」写一份项目总结（400 字以内），结构：\n一、项目概述（2-3 句：做什么、核心能力）\n二、完成情况（有任务时写任务 X/Y 完成；无任务列表且项目已完成时写"项目已完成，依据项目档案"，不要提"任务 0/0"）\n三、亮点与沉淀（从档案/笔记中提炼真实亮点：技术方案、测试、部署、架构等细节）\n四、可复用经验（一句话：这个项目的模式/方案对后续项目有什么参考价值）\n要求：\n1. 只基于提供的任务/档案/笔记内容，不编造；内容不足写"（未在文档中说明）"\n2. 项目已完成，总结要肯定完成状态；不要输出"建议补充任务/拆解/记录"之类的建议——项目已经做完了\n3. 不要用 # 标题。\n\n【任务清单】\n${taskLines}\n\n【笔记标题】\n${noteLines}\n${archiveNote ? `【项目档案全文】\n${(archiveNote.content ?? "").slice(0, 3000)}` : ""}`;

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
