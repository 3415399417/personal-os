import { NextResponse } from "next/server";
import { exec } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 用系统默认浏览器打开外部链接。
 * 服务端执行 start 命令（Windows）——绕开 WebView window.open 拦截与 Tauri 注入依赖，
 * 桌面版/网页版均可使用。仅允许 http/https。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const url = String(body?.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ ok: false, error: "仅支持 http/https 链接" }, { status: 400 });
    }
    // Windows: start "" "url" 用默认浏览器打开；URL 已在正则校验，防注入
    exec(`start "" "${url}"`, { windowsHide: true }, (err) => {
      if (err) console.error("[api/open-external] failed:", err.message);
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/open-external] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
