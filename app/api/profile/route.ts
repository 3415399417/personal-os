import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 个人资料（单行）：GET 返回当前资料，无记录时给默认值 */
export async function GET() {
  try {
    const p = await prisma.profile.findUnique({ where: { id: "main" } });
    return NextResponse.json({
      ok: true,
      profile: {
        name: p?.name ?? "",
        role: p?.role ?? "外贸创业者",
        focus: p?.focus ?? "外贸AI系统搭建",
        avatar: p?.avatar ?? "",
      },
    });
  } catch (err) {
    console.error("[api/profile] get failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/** 保存个人资料（upsert 单行） */
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
    }
    const name = typeof body.name === "string" ? body.name.slice(0, 30) : "";
    const role = typeof body.role === "string" ? body.role.slice(0, 30) : "外贸创业者";
    const focus = typeof body.focus === "string" ? body.focus.slice(0, 30) : "外贸AI系统搭建";
    const avatar = typeof body.avatar === "string" ? body.avatar.slice(0, 200_000) : ""; // 96x96 JPEG base64 约 5-8KB，留足余量

    await prisma.profile.upsert({
      where: { id: "main" },
      update: { name, role, focus, avatar },
      create: { id: "main", name, role, focus, avatar },
    });
    return NextResponse.json({ ok: true, profile: { name, role, focus, avatar } });
  } catch (err) {
    console.error("[api/profile] save failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
