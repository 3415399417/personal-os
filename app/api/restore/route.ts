import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKUP_DIR = path.join(process.cwd(), "backup");
const DB_PATH = path.join(process.cwd(), "dev.db");

/** 列出可用备份（按时间倒序） */
export async function GET() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return NextResponse.json({ ok: true, backups: [] });
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => /^dev-\d{14}\.db$/.test(f))
      .sort()
      .reverse()
      .slice(0, 20)
      .map((f) => {
        const st = fs.statSync(path.join(BACKUP_DIR, f));
        // dev-YYYYMMDDHHmmss.db → 可读时间
        const s = f.replace(/^dev-/, "").replace(/\.db$/, "");
        const d = new Date(
          Number(s.slice(0, 4)),
          Number(s.slice(4, 6)) - 1,
          Number(s.slice(6, 8)),
          Number(s.slice(8, 10)),
          Number(s.slice(10, 12)),
          Number(s.slice(12, 14)),
        );
        return {
          file: f,
          time: `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
          sizeKB: Math.round(st.size / 1024),
        };
      });
    return NextResponse.json({ ok: true, backups: files });
  } catch (err) {
    console.error("[api/restore] list failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * 还原备份：把选中的 backup/dev-*.db 复制为 dev.db。
 * 先备份当前库为 dev.db.pre-restore，再覆盖。
 * ⚠️ 调用后必须重启服务（进程内 SQLite 连接仍指向旧文件句柄）。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const file = String(body?.file ?? "");
    if (!/^dev-\d{14}\.db$/.test(file)) {
      return NextResponse.json({ ok: false, error: "无效的备份文件名" }, { status: 400 });
    }
    const src = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(src)) {
      return NextResponse.json({ ok: false, error: "备份文件不存在" }, { status: 404 });
    }
    // 1. 当前库先备份为 .pre-restore（防手滑）
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, DB_PATH + ".pre-restore");
    }
    // 2. 覆盖
    fs.copyFileSync(src, DB_PATH);
    const st = fs.statSync(src);
    return NextResponse.json({
      ok: true,
      restored: file,
      sizeKB: Math.round(st.size / 1024),
      note: "还原成功，请重启应用（桌面版请完全退出后重新打开）",
      backupOfCurrent: "dev.db.pre-restore",
    });
  } catch (err) {
    console.error("[api/restore] failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
