// 浏览器端验收：AI 对话操作数据库 → 页面数据联动 → 刷新持久化 → 工具提示展示
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync);
const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " → " + detail : ""}`);
};

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. 在 /ai 页与 AI 对话：新建任务 + 设焦点（连续操作）
  await page.goto(`${BASE}/ai`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  await page.type(".chat-input-row input", "新建任务「AI对话任务」加入 must 组，并设为今日最重要");
  await page.keyboard.press("Enter");
  // 等待回复完成（工具循环可能多轮）
  let done = false;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    done = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".chat-row.assistant")].filter((r) => !r.textContent.includes("正在思考"));
      return rows.length >= 1;
    });
    if (done) break;
  }
  await sleep(800);
  const lastMsg = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".chat-row.assistant")].filter((r) => !r.textContent.includes("正在思考"));
    return rows.length ? rows[rows.length - 1].textContent : "";
  });
  console.log("  AI reply:", lastMsg.slice(0, 120).replace(/\n/g, " "));
  check("AI 对话创建任务（含工具提示）", lastMsg.includes("AI对话任务"), lastMsg.slice(0, 80));

  // 2. 页面数据联动：任务出现在 /today（AI 写库后刷新页面读取）
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const taskOnPage = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".task-item")];
    return items.some((b) => b.textContent.includes("AI对话任务"));
  });
  check("刷新后任务出现在 /today", taskOnPage);

  // 3. 侧边栏今日最重要 = 1（AI 设置的焦点）
  const focusNum = await page.evaluate(() => document.querySelector(".sf-num")?.textContent);
  check("侧边栏今日最重要 = 1", focusNum === "1", `focus=${focusNum}`);

  // 4. AI 对话历史持久化：回 /ai 刷新后对话仍在
  await page.goto(`${BASE}/ai`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const chatCountAfter = await page.evaluate(() => document.querySelectorAll(".chat-row").length);
  check("刷新后对话历史仍在", chatCountAfter >= 2, `rows=${chatCountAfter}`);

  // 5. 让 AI 把任务标记完成 → 进度联动
  await page.type(".chat-input-row input", "把「AI对话任务」标记完成");
  await page.keyboard.press("Enter");
  let done2 = false;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    done2 = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".chat-row.assistant")].filter((r) => !r.textContent.includes("正在思考"));
      return rows.length >= 2;
    });
    if (done2) break;
  }
  await sleep(500);
  const reply2 = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".chat-row.assistant")].filter((r) => !r.textContent.includes("正在思考"));
    return rows.length ? rows[rows.length - 1].textContent : "";
  });
  check("AI 标记完成", reply2.includes("完成"), reply2.slice(0, 80));

  // 6. 清理：删除 AI 对话任务（直接 API，避免再走确认流程）
  const clean = await page.evaluate(async () => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const tasks = await call("getTodayTasks");
    for (const t of tasks.filter((x) => x.text.includes("AI对话任务"))) {
      await call("deleteTask", { id: t.id });
    }
    await call("clearConversation");
    return "ok";
  });
  check("清理测试数据", clean === "ok");

  await page.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL BROWSER FC CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
