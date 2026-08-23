// 验证：任务/笔记超 8 条折叠 + 展开/收起
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

// 准备：项目 + 10 任务 + 10 笔记
const proj = await api("createProject", { name: "折叠测试项目", status: "active" });
const pid = proj.id;
for (let i = 1; i <= 10; i++) {
  await api("createTask", { title: `折叠任务${i}`, group: i <= 4 ? "must" : "doing", projectId: pid });
}
for (let i = 1; i <= 10; i++) {
  await api("createNote", { title: `折叠笔记${i}`, content: "x", type: "笔记", projectId: pid });
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1200);

  /* 1. 折叠态：任务 8 条 + 展开按钮 */
  const collapsed = await page.evaluate(() => {
    const tasksUl = document.querySelector('[data-od-id="project-tasks"] .task-list');
    const taskCount = tasksUl.querySelectorAll("li").length;
    const taskBtn = [...document.querySelectorAll(".collapse-toggle")].map((b) => b.textContent.trim());
    const notesPanel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const noteCount = notesPanel.querySelectorAll(".note-item").length;
    return { taskCount, taskBtn, noteCount };
  });
  console.log("collapsed:", JSON.stringify(collapsed));
  check("任务折叠为 8 条", collapsed.taskCount === 8, `${collapsed.taskCount}`);
  check("有展开全部按钮（任务/笔记）", collapsed.taskBtn.some((t) => t.includes("展开全部（共 10 条）")) && collapsed.taskBtn.some((t) => t.includes("展开全部（共 10 篇）")), collapsed.taskBtn.join(" | "));
  check("笔记折叠为 8 篇", collapsed.noteCount === 8, `${collapsed.noteCount}`);

  /* 2. 展开任务 */
  await page.evaluate(() => {
    [...document.querySelectorAll(".collapse-toggle")].find((b) => b.textContent.includes("展开全部（共 10 条）")).click();
  });
  await sleep(400);
  const expandedTasks = await page.evaluate(() => {
    const tasksUl = document.querySelector('[data-od-id="project-tasks"] .task-list');
    const btns = [...document.querySelectorAll(".collapse-toggle")].map((b) => b.textContent.trim());
    return { count: tasksUl.querySelectorAll("li").length, btns };
  });
  console.log("expanded:", JSON.stringify(expandedTasks));
  check("展开后任务显示 10 条", expandedTasks.count === 10, `${expandedTasks.count}`);
  check("任务按钮变为「收起」", expandedTasks.btns.some((t) => t === "收起"), expandedTasks.btns.join(" | "));

  /* 3. 展开笔记 */
  await page.evaluate(() => {
    [...document.querySelectorAll(".collapse-toggle")].find((b) => b.textContent.includes("展开全部（共 10 篇）")).click();
  });
  await sleep(400);
  const expandedNotes = await page.evaluate(() => {
    const notesPanel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    return notesPanel.querySelectorAll(".note-item").length;
  });
  check("展开后笔记显示 10 篇", expandedNotes === 10, `${expandedNotes}`);

  /* 4. 收起任务 */
  await page.evaluate(() => {
    [...document.querySelectorAll(".collapse-toggle")].find((b) => b.textContent.trim() === "收起").click();
  });
  await sleep(400);
  const reCollapsed = await page.evaluate(() => {
    const tasksUl = document.querySelector('[data-od-id="project-tasks"] .task-list');
    return tasksUl.querySelectorAll("li").length;
  });
  check("再点收起回到 8 条", reCollapsed === 8, `${reCollapsed}`);

  await page.screenshot({ path: "_verify/collapse-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
