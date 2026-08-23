// /api/incubate — 文档孵化：粘贴开发文档 → AI 生成项目 + 任务清单（含产物 artifacts）
// 仅解析预览，不落库；确认后由前端调 /api/data 的 createProjectWithTasks 入库。
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com";
const API_KEY = process.env.DSH_DEEPSEEK_KEY;

const MAX_DOC_CHARS = 20000;

const SYSTEM_PROMPT = `你是资深技术项目经理。用户会给你一份新项目的开发文档，你要把它拆解成一份可执行的开发计划。

输出要求（严格 JSON，不要任何其他文字）：
{
  "name": "项目名（≤20字，从文档提炼，简洁准确）",
  "description": "项目一句话描述（≤80字）",
  "tasks": [
    {
      "title": "任务标题（≤40字，动词开头，如：搭建项目脚手架）",
      "description": "任务说明（1-2句，含验收要点，≤120字）",
      "group": "must 或 waiting",
      "artifacts": [
        { "type": "file", "path": "src/api/auth.ts" },
        { "type": "folder", "path": "src/services/auth/" },
        { "type": "glob", "pattern": "tests/auth/**" }
      ]
    }
  ]
}

拆解规则：
1. 按开发阶段拆（如：需求确认 → 设计 → 核心开发 → 测试 → 交付），任务数 5~15 个，覆盖完整闭环。
2. group 语义：第一阶段能立刻开工且无前置依赖的任务用 "must"（必须完成）；依赖前面阶段完成才能开始的任务用 "waiting"（等待）。不要用 doing/done。
3. artifacts = 该任务完成后"应该产出的东西"，从文档里推断实际文件/目录：
   - type 只有三种：file（单个文件）、folder（整个目录）、glob（通配模式，如 tests/**）
   - 路径用正斜杠，相对项目根目录；推断不出就留空数组 []
   - 每个任务 1~4 个 artifacts 即可，不要堆砌
4. 文档没提到的内容不要臆造；任务标题/说明用中文。
5. JSON 格式严格：所有字符串用双引号，数组/对象最后一个元素后不要加逗号，不允许注释。`;

/** 宽松解析模型输出：去代码块围栏、修复常见尾逗号、必要时取第一个 JSON 对象 */
function extractJson(raw: string): any {
  let cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // 常见尾逗号修复：",]" → "]" 和 ",}" → "}"
    const fixed = cleaned.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(fixed);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]);
        } catch {
          return JSON.parse(m[0].replace(/,\s*([}\]])/g, "$1"));
        }
      }
      throw new Error("AI 输出不是合法 JSON");
    }
  }
}

/** 校验并规整 plan（容错：缺字段给默认值，坏字段丢弃） */
function normalizePlan(raw: any) {
  const name = String(raw?.name ?? "").trim().slice(0, 20);
  const description = String(raw?.description ?? "").trim().slice(0, 80);
  if (!name) throw new Error("AI 未提取出项目名");
  const rawTasks = Array.isArray(raw?.tasks) ? raw.tasks : [];
  const tasks = rawTasks
    .map((t: any) => ({
      title: String(t?.title ?? "").trim().slice(0, 40),
      description: String(t?.description ?? "").trim().slice(0, 120),
      group: t?.group === "waiting" ? "waiting" : "must",
      artifacts: (Array.isArray(t?.artifacts) ? t.artifacts : [])
        .map((a: any) => {
          const type = ["file", "folder", "glob"].includes(a?.type) ? a.type : null;
          if (!type) return null;
          const p = String(a?.path ?? a?.pattern ?? "").trim().replace(/\\/g, "/").slice(0, 200);
          if (!p) return null;
          return type === "glob" ? { type, pattern: p } : { type, path: p };
        })
        .filter(Boolean)
        .slice(0, 4),
    }))
    .filter((t: any) => t.title);
  if (tasks.length === 0) throw new Error("AI 未生成任务清单");
  return { name, description, tasks };
}

export async function POST(req: Request) {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: "服务端未配置 DSH_DEEPSEEK_KEY" }, { status: 500 });
  }
  let body: { docText?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const docText = String(body?.docText ?? "").trim();
  if (!docText) {
    return NextResponse.json({ ok: false, error: "文档内容为空" }, { status: 400 });
  }
  if (docText.length > MAX_DOC_CHARS) {
    return NextResponse.json(
      { ok: false, error: `文档过长（${docText.length} 字符），请截取核心部分（≤${MAX_DOC_CHARS}）` },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${API_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `开发文档如下：\n\n${docText}` },
        ],
        max_tokens: 8000,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[api/incubate] upstream ${res.status}: ${detail.slice(0, 200)}`);
      return NextResponse.json({ ok: false, error: `上游 API 错误 ${res.status}` }, { status: 502 });
    }
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "";
    if (!raw) return NextResponse.json({ ok: false, error: "AI 返回为空" }, { status: 502 });

    let plan: any;
    try {
      plan = normalizePlan(extractJson(raw));
    } catch (err) {
      console.error("[api/incubate] parse failed:", err, "raw:", raw.slice(0, 300));
      return NextResponse.json({ ok: false, error: `解析 AI 输出失败：${err instanceof Error ? err.message : String(err)}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    console.error("[api/incubate] failed:", err);
    return NextResponse.json({ ok: false, error: "调用 AI 服务失败" }, { status: 502 });
  }
}
