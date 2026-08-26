// 验证自动备份：清标记 → 打开页面 → 检查备份结果（新建或当天已备份跳过）
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BACKUP_DIR = "E:\\我的项目\\personal-os\\backup";

// 当天（本地日期）是否已有备份文件
function hasTodayBackup() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR).some((f) => f.startsWith(`dev-${ymd}`))
    : false;
}

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
  const hadToday = hasTodayBackup();
  // 新建成功：文件数 +1 且有 toast；或当天已备份过：文件数不变（服务端去重，正常）
  const ok = (after > before && /备份/.test(toast ?? "")) || (after === before && hadToday);
  console.log(ok ? "✅ 自动备份正常（新建或当天已备份跳过）" : "❌ 自动备份未生效");
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
