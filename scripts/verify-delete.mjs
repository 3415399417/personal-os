// 任务删除功能验收（真实鼠标，限定作用域）：/today + 项目详情（进度联动）+ 侧边栏 + 刷新持久化
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

/** 真实鼠标点击指定作用域内任务行的删除按钮（scope: "main" 或 "sidebar"） */
async function realClickDel(page, labelIncludes, scope = "main") {
  const target = await page.evaluate(
    ({ kw, sc }) => {
      const root = sc === "sidebar" ? ".side-todos" : "main";
      const items = [...document.querySelectorAll(`${root} .task-item, ${root} .todo-item`)];
      const item = items.find((b) => (b.getAttribute("aria-label") || b.textContent || "").includes(kw));
      if (!item) return null;
      const del = item.parentElement?.querySelector("button.task-del");
      if (!del) return null;
      const r = del.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    },
    { kw: labelIncludes, sc: scope },
  );
  if (!target) return false;
  await page.mouse.move(target.x, target.y);
  await sleep(200);
  await page.mouse.click(target.x, target.y);
  return true;
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* ── 准备：清库 + 建项目 + 任务 ── */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(500);
  const setup = await page.evaluate(async () => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const tasks = await call("getTodayTasks");
    for (const t of tasks) await call("deleteTask", { id: t.id });
    const projects = await call("getProjects");
    for (const p of projects) {
      const d = await call("getProject", { id: p.id });
      for (const t of d.tasks) await call("deleteTask", { id: t.id });
      await call("deleteProject", { id: p.id });
    }
    const p = await call("createProject", { name: "删除验收项目", desc: "删除测试", status: "active" });
    await call("createTask", { title: "删我甲", group: "must" });
    await call("createTask", { title: "删我乙", group: "doing" });
    await call("createTask", { title: "项目删我甲", group: "must", projectId: p.id });
    await call("createTask", { title: "项目删我乙", group: "doing", projectId: p.id });
    return p.id;
  });

  /* ── /today：hover 显示删除按钮 + 真实点击删除（main 作用域） ── */
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const itemRect = await page.evaluate(() => {
    const item = [...document.querySelectorAll("main .task-item")].find((b) => (b.getAttribute("aria-label") || "").includes("删我甲"));
    const r = item?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  await page.mouse.move(itemRect.x, itemRect.y);
  await sleep(300);
  const delVisible = await page.evaluate(() => {
    const item = [...document.querySelectorAll("main .task-item")].find((b) => (b.getAttribute("aria-label") || "").includes("删我甲"));
    const del = item?.parentElement?.querySelector(".task-del");
    return del ? getComputedStyle(del).opacity : "no-btn";
  });
  check("hover 显示删除按钮", delVisible === "1", `opacity=${delVisible}`);

  await realClickDel(page, "删我甲", "main");
  await sleep(900);
  const todayAfterDel = await page.evaluate(() => {
    const items = [...document.querySelectorAll("main .task-item")].map((b) => (b.getAttribute("aria-label") || "").replace("标记完成：", "").replace("取消完成：", ""));
    const total = document.querySelector("[data-od-id='today-total-progress'] .progress-label")?.textContent ?? "";
    return { has: items.includes("删我甲"), total };
  });
  check("today 删除任务生效", !todayAfterDel.has, `remaining=${todayAfterDel.total}`);

  /* ── 项目详情：勾选 → 删除 → 进度联动 ── */
  await page.goto(`${BASE}/projects/${setup}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const chk = await page.evaluate(() => {
    const item = [...document.querySelectorAll("[data-od-id='project-tasks'] .task-item")].find((b) => b.textContent.includes("项目删我甲"));
    const r = item?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  await page.mouse.click(chk.x, chk.y); // 勾选项目删我甲 → 1/2 = 50%
  await sleep(900);
  await realClickDel(page, "项目删我乙", "main"); // 删除项目删我乙 → 剩 1 已完成 = 100%
  await sleep(900);
  const projAfter = await page.evaluate(() => ({
    label: document.querySelector("[data-od-id='project-tasks']")?.closest(".page")?.querySelector(".panel .progress-label b")?.textContent ?? "",
    tasks: document.querySelectorAll("[data-od-id='project-tasks'] .task-item").length,
    hasDel: [...document.querySelectorAll("[data-od-id='project-tasks'] .task-item")].some((b) => b.textContent.includes("项目删我乙")),
  }));
  check("详情删除任务生效（剩1任务）", projAfter.tasks === 1 && !projAfter.hasDel, JSON.stringify(projAfter));
  check("详情删除后进度 100%（1完成/1总）", projAfter.label === "100%", projAfter.label);

  /* ── 侧边栏：删除待办（sidebar 作用域） ── */
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const sidebarBefore = await page.evaluate(() => document.querySelectorAll(".side-todos .todo-item").length);
  await realClickDel(page, "删我乙", "sidebar");
  await sleep(900);
  const sidebarAfter = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".side-todos .todo-item")].map((b) => b.textContent);
    return { count: items.length, has: items.some((t) => t.includes("删我乙")) };
  });
  check("侧边栏删除待办生效", sidebarAfter.count === sidebarBefore - 1 && !sidebarAfter.has, JSON.stringify(sidebarAfter));

  /* ── 刷新持久化：删除结果保留 ── */
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const afterReload = await page.evaluate(() => {
    const items = [...document.querySelectorAll("main .task-item")].map((b) => (b.getAttribute("aria-label") || "").replace("标记完成：", "").replace("取消完成：", ""));
    return {
      hasDelA: items.includes("删我甲"),
      hasDelB: items.includes("删我乙"),
      hasProjDel: items.includes("项目删我乙"),
      count: items.length,
    };
  });
  check("刷新后删除不复活", !afterReload.hasDelA && !afterReload.hasDelB && !afterReload.hasProjDel && afterReload.count === 1, JSON.stringify(afterReload));

  /* ── 清理 ── */
  const clean = await page.evaluate(async (pid) => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const tasks = await call("getTodayTasks");
    for (const t of tasks) await call("deleteTask", { id: t.id });
    const proj = await call("getProject", { id: pid });
    if (proj) {
      for (const t of proj.tasks) await call("deleteTask", { id: t.id });
      await call("deleteProject", { id: pid });
    }
    return "ok";
  }, setup);
  check("清理测试数据", clean === "ok");

  await page.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL DELETE CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
