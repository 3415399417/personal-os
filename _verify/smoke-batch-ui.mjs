// UI 冒烟：批量确认按钮 + 展开区"还缺什么"
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:3000";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dbg-ui-"));

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
  // 造数据：2 个 ready 任务 + 1 个缺产物任务
  const d1 = await callData("createProjectWithTasks", {
    name: "ui-batch-test",
    folderPath: TMP,
    tasks: [
      { title: "A任务", group: "must", artifacts: [{ type: "file", path: "src/a.ts" }] },
      { title: "B任务", group: "must", artifacts: [{ type: "file", path: "src/b.ts" }] },
      { title: "C缺产物", group: "waiting", artifacts: [{ type: "file", path: "missing/c.ts" }] },
    ],
  });
  pid = d1?.project?.id;
  fs.mkdirSync(path.join(TMP, "src"), { recursive: true });
  fs.writeFileSync(path.join(TMP, "src", "a.ts"), "a");
  fs.writeFileSync(path.join(TMP, "src", "b.ts"), "b");
  await callData("scanProject", { projectId: pid });

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err.message).slice(0, 400)));

  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  // 1. 批量按钮存在且显示数量
  const btnText = await page.evaluate(() => document.querySelector(".task-confirm-all")?.textContent ?? null);
  ok("批量确认按钮显示（2 个）", btnText?.includes("全部确认完成（2）") ?? false, btnText ?? "未找到");

  // 2. 展开 C 任务（缺产物）→ 显示缺失提示
  const cExpanded = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".task-item"));
    const c = items.find((el) => el.textContent.includes("C缺产物"));
    if (!c) return false;
    c.click();
    return true;
  });
  await new Promise((r) => setTimeout(r, 1500));
  const missingInfo = await page.evaluate(() => ({
    missingTitle: document.querySelector(".task-art-status .task-expand-title")?.textContent ?? null,
    missingItems: Array.from(document.querySelectorAll(".task-missing li")).map((li) => li.textContent),
    matchedLine: document.querySelector(".task-matched")?.textContent ?? null,
  }));
  ok("展开 C 任务成功", cExpanded, "");
  ok("缺失提示标题含 1 个产物未检测到", (missingInfo.missingTitle ?? "").includes("1 个产物未检测到"), missingInfo.missingTitle ?? "");
  ok("缺失列表列出 missing/c.ts", (missingInfo.missingItems ?? []).some((s) => s.includes("missing/c.ts")), JSON.stringify(missingInfo.missingItems));

  // 3. 点批量确认 → 全部完成
  await page.evaluate(() => {
    const btn = document.querySelector(".task-confirm-all");
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  const afterBatch = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".task-item"));
    const doneCount = items.filter((el) => el.classList.contains("done")).length;
    return { doneCount, btnGone: !document.querySelector(".task-confirm-all"), notice: document.querySelector(".scan-notice")?.textContent ?? null };
  });
  ok("批量确认后 2 个任务完成", afterBatch.doneCount === 2, `done=${afterBatch.doneCount}`);
  ok("按钮消失（无 ready 任务）", afterBatch.btnGone, "");
  ok("提示已确认 2 个任务", (afterBatch.notice ?? "").includes("已确认 2 个任务"), afterBatch.notice ?? "");

  console.log("pageerrors:", errors.length ? errors : "none");
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
