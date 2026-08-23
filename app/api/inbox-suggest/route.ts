import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
const API_KEY = process.env.DSH_DEEPSEEK_KEY;

/** 收集箱条目 AI 归类：判断 → 任务 / 笔记 / 归档，并匹配现有项目 */
export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: "未配置 DSH_DEEPSEEK_KEY" }, { status: 500 });
  }
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    if (!text) return NextResponse.json({ ok: false, error: "内容为空" }, { status: 400 });

    const projects = await prisma.project.findMany({ select: { id: true, name: true } });
    const projList = projects.map((p) => `${p.name}`).join("、") || "无";

    const prompt = `你是个人 OS 的收件箱分类器。把下面这条收集箱内容归类，规则：
- task：像要做的行动/待办（如"记得给xx回消息"、"下周一交报告"）
- note：像信息/灵感/资料（如"看到一篇讲xx的文章"、"xx的思路"）
- archive：琐事/无行动价值（如"今天天气不错"）
如果内容与某个现有项目相关，返回该项目名（只能从列表里选，没有就空）。
只输出 JSON：{"type":"task|note|archive","title":"处理后的简洁标题(≤20字)","projectName":""}

现有项目：${projList}
内容：${text}`;

    const res = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "";
    let parsed: { type?: string; title?: string; projectName?: string } = {};
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      const m = raw.match(/\{[^}]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const type = parsed.type === "note" ? "note" : parsed.type === "archive" ? "archive" : "task";
    const title = (parsed.title || text).slice(0, 30);
    const project = projects.find((p) => p.name === parsed.projectName) ?? null;

    return NextResponse.json({ ok: true, suggest: { type, title, projectId: project?.id ?? null, projectName: project?.name ?? "" } });
  } catch (err) {
    console.error("[api/inbox-suggest] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
