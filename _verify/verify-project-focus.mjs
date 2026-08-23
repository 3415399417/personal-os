// 验证：项目设为今日焦点 → Hero 项目卡 / /today 焦点区 / 互斥 / 取消
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

// 准备：项目 + 2 任务（1 完成）
const proj = await api("createProject", { name: "焦点测试项目", status: "active" });
const pid = proj.id;
const t1 = await api("createTask", { title: "焦点项目-任务一", group: "must", projectId: pid });
await api("createTask", { title: "焦点项目-任务二", group: "doing", projectId: pid });
await api("toggleTask", { id: t1.id, done: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* 1. 项目详情页：星标按钮存在 → 点击设为焦点 */
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);
  const starBtn = await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".panel-head button")].find((b) => b.textContent.includes("设为今日焦点"));
    if (!btn) return null;
    btn.click();
    return true;
  });
  check("项目概览有「设为今日焦点」按钮并可点击", starBtn === true);
  await sleep(1000);
  const starOn = await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".panel-head button")].find((b) => b.textContent.includes("今日焦点"));
    return !!btn && btn.classList.contains("on");
  });
  check("点击后按钮变为「今日焦点」（实心星）", starOn);

  /* 2. 首页 Hero：项目形态卡 */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);
  const hero = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="focus-project-card"]');
    if (!card) return null;
    const txt = card.textContent;
    const link = card.querySelector("a[data-od-id='focus-continue']");
    return {
      hasName: txt.includes("焦点测试项目"),
      hasProgress: txt.includes("50%") && txt.includes("1/2"),
      hasNext: txt.includes("下一步") && txt.includes("焦点项目-任务二"),
      href: link?.getAttribute("href"),
      hasBar: !!card.querySelector(".progress"),
    };
  });
  console.log("hero:", JSON.stringify(hero));
  check("Hero 显示项目焦点卡（项目名）", hero?.hasName);
  check("Hero 显示进度条 + 任务 1/2 + 50%", hero?.hasProgress && hero?.hasBar);
  check("Hero 显示下一步行动（未完成任务）", hero?.hasNext);
  check("继续工作按钮跳项目详情页", hero?.href === `/projects/${pid}`, hero?.href);

  /* 3. /today：今日焦点项目区 */
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);
  const todayFocus = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="today-focus-project"]');
    if (!sec) return null;
    const txt = sec.textContent;
    const link = sec.querySelector("a");
    return {
      hasName: txt.includes("焦点测试项目"),
      hasNext: txt.includes("下一步行动") && txt.includes("焦点项目-任务二"),
      hasCancel: txt.includes("取消焦点"),
      href: link?.getAttribute("href"),
    };
  });
  console.log("today focus:", JSON.stringify(todayFocus));
  check("/today 显示今日焦点项目区", todayFocus?.hasName);
  check("/today 自动带出下一步行动", todayFocus?.hasNext);
  check("/today 有取消焦点按钮 + 进入项目链接", todayFocus?.hasCancel && todayFocus?.href === `/projects/${pid}`);

  /* 4. 互斥：设任务焦点 → 项目焦点清除 */
  await api("createTask", { title: "[互斥]个人任务", group: "must" });
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2000);
  const focusBtnPos = await page.evaluate(() => {
    const li = [...document.querySelectorAll(".task-list li")].find((x) => x.textContent.includes("[互斥]个人任务"));
    const btn = li?.querySelector(".task-focus");
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (focusBtnPos) {
    await page.mouse.move(focusBtnPos.x, focusBtnPos.y);
    await page.mouse.click(focusBtnPos.x, focusBtnPos.y);
  }
  await sleep(1200);
  // API 确认项目焦点已清除
  const projAfter = await api("getProject", { id: pid });
  check("设任务焦点后项目焦点自动清除（互斥）", projAfter.isTodayFocus === false, `isTodayFocus=${projAfter.isTodayFocus}`);
  const dash = await api("getDashboard", null);
  check("Hero 焦点切换为任务形态", dash.focus.kind === "task", dash.focus.kind);

  /* 5. 项目详情页取消焦点 → Hero 空态 */
  await api("setTaskFocus", { id: t1.id, isFocus: false });
  await api("setProjectFocus", { id: pid, isFocus: true }); // 重新设为项目焦点
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);
  const cancelClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".panel-head button")].find((b) => b.textContent.includes("今日焦点"));
    if (!btn) return false;
    btn.click();
    return true;
  });
  check("详情页「今日焦点」按钮可点击取消", cancelClicked);
  await sleep(1000);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);
  const empty = await page.evaluate(() => {
    const body = document.body.textContent;
    return body.includes("还没有今日焦点") && body.includes("今天任务") && body.includes("今日项目");
  });
  check("取消焦点后 Hero 空态（新引导文案 + 双入口）", empty);

  await page.screenshot({ path: "_verify/project-focus-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
const tasks = await api("getTodayTasks", null);
for (const t of tasks.filter((x) => x.text.startsWith("[互斥]"))) {
  await api("deleteTodo", { id: t.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
