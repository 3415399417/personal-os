// 验证：/today 只显示个人任务，不含项目任务
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

// 准备：项目 + 项目任务 + 个人任务
const proj = await api("createProject", { name: "today隔离项目", status: "active" });
const pid = proj.id;
await api("createTask", { title: "[测试]项目专属任务", group: "doing", projectId: pid });
await api("createTask", { title: "[测试]今日个人任务", group: "must" });
await api("createTask", { title: "[测试]今日进行中", group: "doing" });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2000);

  const res = await page.evaluate(() => {
    const body = document.body.textContent;
    return {
      hasPersonal: body.includes("[测试]今日个人任务"),
      hasDoing: body.includes("[测试]今日进行中"),
      hasProj: body.includes("[测试]项目专属任务"),
    };
  });
  console.log("today:", JSON.stringify(res));
  check("/today 显示个人任务", res.hasPersonal && res.hasDoing);
  check("/today 不显示项目任务", !res.hasProj);

  // API 层复核
  const tasks = await api("getTodayTasks", null);
  check("getTodayTasks 不含项目任务", !tasks.some((t) => t.text === "[测试]项目专属任务"), `count=${tasks.length}`);

  // 项目详情页仍显示项目任务
  const detail = await api("getProject", { id: pid });
  check("项目详情页仍有项目任务", detail.tasks.some((t) => t.text === "[测试]项目专属任务"));

  await page.screenshot({ path: "_verify/today-clean.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
const tasks = await api("getTodayTasks", null);
for (const t of tasks.filter((x) => x.text.startsWith("[测试]"))) {
  await api("deleteTodo", { id: t.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
