import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Markdown 导出：笔记/复盘/资产 → 单个 .md 文件（可迁移、可导入其他笔记软件） */
export async function GET() {
  try {
    const [notes, reviews, assets, projects] = await Promise.all([
      prisma.note.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.review.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.asset.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.project.findMany({ select: { id: true, name: true } }),
    ]);
    const projName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "";

    const parts: string[] = [];
    parts.push("# BetterLife AI 数据导出（Markdown）");
    parts.push(`> 导出时间：${new Date().toLocaleString("zh-CN")}`);
    parts.push("");

    // 笔记
    parts.push("## 📝 笔记");
    if (notes.length === 0) parts.push("（无）");
    for (const n of notes) {
      parts.push(`### ${n.title}`);
      if (n.type) parts.push(`> 类型：${n.type}${n.projectId ? ` · 项目：${projName(n.projectId)}` : ""}`);
      parts.push("");
      parts.push(n.content || "（无内容）");
      parts.push("");
    }

    // 复盘
    parts.push("## 🔁 复盘");
    if (reviews.length === 0) parts.push("（无）");
    for (const r of reviews) {
      parts.push(`### ${r.title || "复盘"}`);
      parts.push(`> 周期：${r.period || "-"} · ${r.createdAt.toLocaleDateString("zh-CN")}`);
      parts.push("");
      parts.push(r.summary || "（无内容）");
      parts.push("");
    }

    // 长期资产
    parts.push("## 💎 长期资产");
    if (assets.length === 0) parts.push("（无）");
    for (const a of assets) {
      parts.push(`### [${a.type}] ${a.title}`);
      parts.push("");
      parts.push(a.content || "（无内容）");
      parts.push("");
    }

    const md = parts.join("\n");
    const filename = `betterlife-export-${new Date().toISOString().slice(0, 10)}.md`;
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[api/export-md] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
