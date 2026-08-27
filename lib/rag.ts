// 第二大脑检索（RAG v2）：8 类本地语料 + 相关度打分排序 + 来源标注
// v1（8-26）：4 类语料、无排序、内联在 chat 路由
// v2（8-27）：语料扩到 任务/笔记/复盘/资产/项目/学习/摩擦日志/收集箱；标题命中权重>正文；多词命中叠加；返回命中数供 UI 展示
import { prisma } from "@/lib/db";

const SPLIT_RE = /[\s，。！？、,.!?;；:：'"“”‘’()（）\[\]【】<>《》/\\|_\-+=*#@~`^%&]+/;

interface Scored {
  text: string;
  score: number;
}

const fmtDate = (d: Date | null | undefined) => (d ? `${d.getMonth() + 1}月${d.getDate()}日` : "");

/** 中文廉价分词：整词（≥2 字）+ 二元组（bigram），覆盖"整句无空格"的提问 */
function tokenize(text: string): string[] {
  const words = text.split(SPLIT_RE).filter((w) => w.length >= 2);
  const tokens = new Set<string>();
  for (const w of words) {
    tokens.add(w);
    if (w.length >= 2) {
      for (let i = 0; i < w.length - 1; i++) tokens.add(w.slice(i, i + 2));
    }
  }
  return [...tokens];
}

/** 打分：整词命中 标题+4/正文+2；二元组命中 标题+2/正文+1；多个 token 叠加 */
function scoreHit(tokens: string[], title: string, body: string): number {
  let score = 0;
  for (const tk of tokens) {
    if (tk.length === 2) {
      if (title.includes(tk)) score += 2;
      else if (body.includes(tk)) score += 1;
    } else {
      if (title.includes(tk)) score += 4;
      else if (body.includes(tk)) score += 2;
    }
  }
  return score;
}

export async function buildRagContext(userText: string): Promise<{ prompt: string; hitCount: number }> {
  const t = (userText ?? "").trim();
  if (!t || t.length < 2) return { prompt: "", hitCount: 0 };
  const tokens = tokenize(t);
  if (tokens.length === 0) return { prompt: "", hitCount: 0 };

  const [tasks, notes, reviews, assets, projects, learnings, frictions, inbox] = await Promise.all([
    prisma.task.findMany({ select: { id: true, title: true, status: true, completedAt: true } }),
    prisma.note.findMany({ select: { id: true, title: true, content: true, createdAt: true } }),
    prisma.review.findMany({ select: { id: true, title: true, summary: true, createdAt: true } }),
    prisma.asset.findMany({ select: { id: true, title: true, type: true, content: true, updatedAt: true } }),
    prisma.project.findMany({ select: { id: true, name: true, description: true, status: true } }),
    prisma.learningRecord.findMany({ select: { id: true, title: true, content: true } }),
    prisma.frictionLog.findMany({ select: { id: true, content: true, createdAt: true } }),
    prisma.resource.findMany({ select: { id: true, name: true, description: true, type: true } }),
  ]);

  const scored: Scored[] = [];
  const push = (kind: string, title: string, body: string, date = "") => {
    const score = scoreHit(tokens, title, body);
    if (score > 0) {
      scored.push({ text: `【${kind}】${title}${date ? `（${date}）` : ""}：${body.slice(0, 120)}`, score });
    }
  };

  for (const x of tasks) push("任务", x.title, x.status === "completed" ? "已完成" : "未完成", fmtDate(x.completedAt));
  for (const x of notes) push("笔记", x.title, x.content, fmtDate(x.createdAt));
  for (const x of reviews) push("复盘", x.title ?? "复盘", x.summary, fmtDate(x.createdAt));
  for (const x of assets) push("资产", x.title, x.content);
  for (const x of projects) push("项目", x.name, `${x.status} ${x.description ?? ""}`);
  for (const x of learnings) push("学习", x.title, x.content);
  for (const x of frictions) push("摩擦记录", "摩擦日志", x.content, fmtDate(x.createdAt));
  for (const x of inbox) push("收集箱", x.name, `${x.type ?? ""} ${x.description ?? ""}`);

  if (scored.length === 0) return { prompt: "", hitCount: 0 };

  // 相关度排序（分数降序），取前 6 条
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 6);

  return {
    prompt: `【第二大脑检索（命中你的历史数据 ${top.length} 条；回答时优先引用真实记录，并标注来源如“来源：笔记《X》/复盘《X》”，没有依据就说不确定）】\n${top.map((x) => x.text).join("\n")}`,
    hitCount: top.length,
  };
}
