// 验证：今日执行战报卡（进度条 + 四行数据 + 焦点行 + 空态）
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

// 准备：个人任务 + 项目（焦点）+ 学习记录 + 提醒
const proj = await api("createProject", { name: "战报焦点项目", status: "active" });
const pid = proj.id;
await api("createTask", { title: "战报任务一", group: "must", projectId: pid });
await api("createTask", { title: "战报任务二", group: "doing", projectId: pid });
await api("setProjectFocus", { id: pid, isFocus: true });
await api("createTask", { title: "[战报]个人任务A", group: "must" });
await api("createTask", { title: "[战报]个人任务B", group: "must" });
await api("createTask", { title: "[战报]个人任务C", group: "doing" });
await api("createLearningRecord", { title: "战报学习", progress: 45 });
await api("createReminder", { title: "[战报]已响提醒", remindAt: "2000-01-01T01:00:00.000Z" });
await api("updateReminderStatus", { id: (await api("getReminders", null)).find((r) => r.title === "[战报]已响提醒").id, status: "done" });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);

  const card = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-exec"]');
    if (!c) return null;
    const txt = c.textContent;
    const links = [...c.querySelectorAll(".exec-link")];
    return {
      hasProgress: txt.includes("今日总进度") && !!c.querySelector(".exec-progress .progress i"),
      hasTask: txt.includes("个人任务") && txt.includes("待完成"),
      hasFocus: txt.includes("今日焦点") && txt.includes("战报焦点项目"),
      hasLearn: txt.includes("今日学习") && txt.includes("45 分钟"),
      hasReminder: txt.includes("今日提醒") && txt.includes("已响"),
      linkCount: links.length,
      hrefs: links.map((l) => l.getAttribute("href")),
    };
  });
  console.log("card:", JSON.stringify(card));
  check("今日总进度条存在", card?.hasProgress);
  check("个人任务行（待完成数）", card?.hasTask);
  check("今日焦点行显示焦点项目", card?.hasFocus);
  check("今日学习行（45 分钟）", card?.hasLearn);
  check("今日提醒行（已响）", card?.hasReminder);
  check("可点击行有跳转（/today、项目页、/learning）", card?.linkCount >= 3 && card?.hrefs.includes("/today") && card?.hrefs.includes(`/projects/${pid}`) && card?.hrefs.includes("/learning"), card?.hrefs.join(","));

  await page.screenshot({ path: "_verify/exec-card-v2.png" });

  /* 空态：清理个人任务后刷新 → 显示引导（仍有焦点时不显示空态） */
  const tasks = await api("getTodayTasks", null);
  for (const t of tasks.filter((x) => x.text.startsWith("[战报]"))) {
    await api("deleteTodo", { id: t.id });
  }
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(2000);
  const emptyOrFocus = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-exec"]');
    const txt = c ? c.textContent : "";
    return txt.includes("今日焦点");
  });
  check("清空个人任务后卡片仍显示焦点行（不崩）", emptyOrFocus);
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
const all = await api("getReminders", null);
for (const r of all.filter((x) => x.title.startsWith("[战报]"))) {
  await api("deleteReminder", { id: r.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
