// 验证：侧边栏待办（个人）与项目任务互不混杂
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

// 准备：测试项目 + 项目任务 + 个人待办
const proj = await api("createProject", { name: "隔离测试项目", status: "active" });
const pid = proj.id;
const projTask = await api("createTask", { title: "[测试]项目内任务", group: "must", projectId: pid });
const todo = await api("createTodo", { text: "[测试]个人待办" });
console.log("project:", pid, "projTask:", projTask.id, "todo:", todo.id);

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* 1. 首页侧边栏：只有个人待办，无项目任务 */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const sidebar = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-todos"]');
    const txt = sec ? sec.textContent : "";
    return {
      hasPersonal: txt.includes("[测试]个人待办"),
      hasProjTask: txt.includes("[测试]项目内任务"),
    };
  });
  check("侧边栏显示个人待办", sidebar.hasPersonal);
  check("侧边栏不显示项目任务", !sidebar.hasProjTask, JSON.stringify(sidebar));

  /* 2. 项目详情页：只有项目任务，无个人待办 */
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const detail = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="project-tasks"]');
    const txt = sec ? sec.textContent : "";
    return {
      hasProjTask: txt.includes("[测试]项目内任务"),
      hasPersonal: txt.includes("[测试]个人待办"),
    };
  });
  check("项目详情显示项目任务", detail.hasProjTask);
  check("项目详情不显示个人待办", !detail.hasPersonal, JSON.stringify(detail));

  /* 3. API 层复核 */
  const todos = await api("getTodos", null);
  check("getTodos 只含个人待办", todos.some((t) => t.id === todo.id) && !todos.some((t) => t.id === projTask.id), `todos=${todos.length}`);
  const p = await api("getProject", { id: pid });
  check("getProject 任务只含项目任务", p.tasks.some((t) => t.id === projTask.id) && !p.tasks.some((t) => t.id === todo.id), `tasks=${p.tasks.length}`);
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
await api("deleteTodo", { id: todo.id });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
