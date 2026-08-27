// 本地接口：用资源管理器打开项目文件夹（仅本机可用，浏览器 JS 无法直接调资源管理器）
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { path?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const p = (body.path ?? "").trim();
  if (!p) {
    return NextResponse.json({ ok: false, error: "缺少文件夹路径" }, { status: 400 });
  }
  if (!existsSync(p)) {
    return NextResponse.json({ ok: false, error: `文件夹不存在：${p}` }, { status: 404 });
  }
  // execFile 不经 shell，避免路径注入；explorer 直接打开目录
  await new Promise<void>((resolve) => {
    execFile("explorer.exe", [p], (err) => {
      // explorer 即使成功也可能返回非零码，这里不当作失败
      resolve();
    });
  });
  return NextResponse.json({ ok: true, path: p });
}
