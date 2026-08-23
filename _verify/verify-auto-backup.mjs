// 验证自动备份：清标记 → 打开页面 → 检查 backup/ 新文件 + toast
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BACKUP_DIR = "E:\\我的项目\\personal-os\\backup";

(async () => {
  // 记录备份前文件数
  const before = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("dev-")).length : 0;

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  // 清掉今日备份标记（模拟每天首次打开）
  await page.evaluateOnNewDocument(() => {
    localStorage.removeItem("personalos:backup-day");
  });

  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 4000));

  const toast = await page.evaluate(() => document.querySelector(".global-toast")?.textContent ?? null);
  const after = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith("dev-")).length;

  console.log("备份前文件数:", before, "→ 备份后:", after);
  console.log("toast:", toast ?? "无");
  const ok = after > before && /备份/.test(toast ?? "");
  console.log(ok ? "✅ 自动备份生效" : "❌ 自动备份未生效");
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
