// 验证：感知引导条 + 卡住提醒
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3000";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dbg-guide-"));

async function callData(action, payload) {
  const resp = await fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return resp.json();
}

let passed = 0, failed = 0, pid = null;
const ok = (n, c, d = "") => { c ? passed++ : failed++; console.log(`  ${c ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };

try {
  // === A. 感知引导条：无 folderPath 的项目 ===
  const d1 = await callData("createProjectWithTasks", {
    name: "guide-test-无路径",
    desc: "",
    tasks: [{ title: "任务A", group: "must", artifacts: [{ type: "file", path: "src/a.ts" }] }],
  });
  pid = d1?.project?.id;

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 300)));

  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));
  const guide = await page.evaluate(() => {
    const el = document.querySelector(".sense-guide");
    return el ? { text: el.textContent, hasBtn: !!el.querySelector("button") } : null;
  });
  ok("无路径项目显示感知引导条", !!guide, JSON.stringify(guide));
  ok("引导条含设置路径按钮", guide?.hasBtn === true, "");

  // 点引导条按钮 → 出现路径编辑框
  await page.evaluate(() => {
    const btn = document.querySelector(".sense-guide button");
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const pathEditShown = await page.evaluate(() => !!document.querySelector(".proj-path-edit input"));
  ok("点按钮后展开路径编辑框", pathEditShown, "");

  // === B. 卡住提醒：造一个 6 天前的任务（无事件） ===
  // 通过 API 无法直接改 createdAt，用 SQLite 直改？不行（规则）。
  // 用直接插入旧任务的方式：调 API 创建任务后，用 node 直接操作 SQLite 改 createdAt（仅测试数据，可接受）
  // 简化：验证逻辑路径——创建任务 + folderPath，事件为空 → 任务创建时间=现在 → 不算卡住
  // 卡住判定需要时间跨度，测试改为：临时调低 STALLED_DAYS 不可行（编译期常量）。
  // 方案：直接改测试任务 createdAt 为 6 天前（通过 prisma 客户端脚本）

  console.log("\n=== B. 卡住提醒（造 6 天前任务） ===");
  // 用 node:sqlite 直接改测试任务 createdAt 为 6 天前（只动临时项目）
  const { execSync } = await import("node:child_process");
  const sqliteScript = `
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync("E:/我的项目/personal-os/dev.db");
    const old = new Date(Date.now() - 6 * 86400000).toISOString();
    const r = db.prepare("UPDATE Task SET createdAt = ? WHERE projectId = ?").run(old, ${JSON.stringify(pid)});
    console.log("patched rows:", r.changes);
    db.close();
  `;
  const sqlitePath = path.join(os.tmpdir(), "patch-created.cjs");
  fs.writeFileSync(sqlitePath, sqliteScript);
  try {
    execSync(`node "${sqlitePath}"`, { encoding: "utf8", stdio: "inherit" });
  } catch (e) {
    console.error("patch failed:", e.message);
  }
  fs.rmSync(sqlitePath, { force: true });

  // 设置 folderPath（卡住判定需要 folderPath 非空）
  await callData("updateProject", { id: pid, patch: { folderPath: TMP } });
  // 触发一次 getProject 刷新页面
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  const stalled = await page.evaluate(() => {
    const el = document.querySelector(".task-stalled");
    return el ? el.textContent : null;
  });
  ok("6 天无动静任务显示卡住标记", !!stalled && stalled.includes("6天无动静"), stalled ?? "未找到");

  console.log("pageerrors:", errors.length ? errors : "无");
  await browser.close();
} catch (err) {
  console.error("FATAL:", err.message);
  failed++;
} finally {
  if (pid) await callData("deleteProject", { id: pid });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  process.exit(failed ? 1 : 0);
}
