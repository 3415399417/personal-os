// 验证：/today 设为今日焦点 → 首页 Hero 展示；焦点唯一；取消焦点
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -> " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 准备两个任务
const t1 = await api("createTask", { title: "焦点任务A", group: "must" });
const t2 = await api("createTask", { title: "焦点任务B", group: "doing" });
console.log("tasks:", t1.id, t2.id);

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* ── 1. 初始：首页 Hero 空状态 ── */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const emptyShown = await page.evaluate(() => document.body.textContent.includes("还没有今日最重要任务"));
  check("初始首页 Hero 显示空状态", emptyShown);

  /* ── 2. /today 把 A 设为焦点 ── */
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);
  const starred = await page.evaluate(async () => {
    const li = [...document.querySelectorAll(".task-list li")].find((x) => x.textContent.includes("焦点任务A"));
    if (!li) return "li not found";
    const btn = li.querySelector(".task-focus");
    if (!btn) return "focus btn not found";
    const r = btn.getBoundingClientRect();
    // 真实鼠标点击（headless 合成 click 不可靠）
    const { mouse } = window.__puppeteer ?? {};
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, found: true };
  });
  if (starred?.found) {
    await page.mouse.move(starred.x, starred.y);
    await page.mouse.click(starred.x, starred.y);
  } else {
    // fallback：直接 evaluate click
    await page.evaluate(() => {
      const li = [...document.querySelectorAll(".task-list li")].find((x) => x.textContent.includes("焦点任务A"));
      li.querySelector(".task-focus").click();
    });
  }
  await sleep(900);
  const focusOn = await page.evaluate(() => {
    const li = [...document.querySelectorAll(".task-list li")].find((x) => x.textContent.includes("焦点任务A"));
    const btn = li?.querySelector(".task-focus");
    return btn?.classList.contains("on");
  });
  check("点击星标后 A 变为焦点态（实心星）", focusOn);

  /* ── 3. 首页 Hero 应显示 A ── */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const heroShows = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="focus-task-card"]');
    return card ? card.textContent.includes("焦点任务A") : false;
  });
  check("首页 Hero 显示焦点任务 A", heroShows);

  /* ── 4. 焦点唯一性：把 B 设为焦点后 A 应失去焦点 ── */
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);
  const bPos = await page.evaluate(() => {
    const li = [...document.querySelectorAll(".task-list li")].find((x) => x.textContent.includes("焦点任务B"));
    const btn = li?.querySelector(".task-focus");
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (bPos) {
    await page.mouse.move(bPos.x, bPos.y);
    await page.mouse.click(bPos.x, bPos.y);
  }
  await sleep(900);
  const focusState = await page.evaluate(() => {
    const get = (title) => {
      const li = [...document.querySelectorAll(".task-list li")].find((x) => x.textContent.includes(title));
      return li?.querySelector(".task-focus")?.classList.contains("on") ?? false;
    };
    return { a: get("焦点任务A"), b: get("焦点任务B") };
  });
  check("焦点唯一：B 设为焦点后 A 自动取消", focusState.a === false && focusState.b === true, JSON.stringify(focusState));

  /* ── 5. 首页 Hero 切换为 B ── */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const heroShowsB = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="focus-task-card"]');
    const txt = card ? card.textContent : "";
    return txt.includes("焦点任务B") && !txt.includes("焦点任务A");
  });
  check("首页 Hero 切换到任务 B", heroShowsB);

  /* ── 6. 取消焦点 → Hero 回空状态 ── */
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);
  const bPos2 = await page.evaluate(() => {
    const li = [...document.querySelectorAll(".task-list li")].find((x) => x.textContent.includes("焦点任务B"));
    const btn = li?.querySelector(".task-focus");
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (bPos2) {
    await page.mouse.move(bPos2.x, bPos2.y);
    await page.mouse.click(bPos2.x, bPos2.y);
  }
  await sleep(900);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const emptyAgain = await page.evaluate(() => document.body.textContent.includes("还没有今日最重要任务"));
  check("取消焦点后 Hero 恢复空状态", emptyAgain);

  await page.screenshot({ path: "_verify/focus-flow-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteTask", { id: t1.id });
await api("deleteTask", { id: t2.id });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
