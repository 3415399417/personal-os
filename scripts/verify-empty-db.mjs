// 空库验收：各页面渲染无空白无报错 + 关键交互（新建→勾选→进度→刷新不丢）
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = (process.env.APP_URL ?? "http://localhost:3000/").replace(/\/$/, "");
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

  const routes = [
    { path: "/", expect: ".hero-card", label: "首页" },
    { path: "/today", expect: ".task-groups", label: "今天" },
    { path: "/projects", expect: ".page-scroll", label: "项目" },
    { path: "/learning", expect: ".stat-strip", label: "学习" },
    { path: "/workbench", expect: ".quick-page", label: "工作台" },
    { path: "/review", expect: ".page-scroll", label: "复盘" },
    { path: "/inbox", expect: ".list-card", label: "收集箱" },
    { path: "/notes", expect: ".filter-tabs", label: "笔记" },
    { path: "/assets", expect: ".stat-strip", label: "资产" },
    { path: "/ai", expect: ".chat-wrap", label: "AI" },
    { path: "/settings", expect: ".settings-list", label: "设置" },
  ];

  // 1. 空库各页面渲染
  for (const r of routes) {
    const resp = await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle0", timeout: 60000 });
    await sleep(700);
    const ok = await page.evaluate((sel) => {
      // 只检查真实错误：应用错误文本；nextjs-portal 是 dev 工具注入，非错误
      const appErr = document.body.textContent.includes("Application error") || document.body.textContent.includes("Unhandled Runtime Error");
      return !!document.querySelector(sel) && !appErr;
    }, r.expect);
    check(`空库渲染 ${r.label}`, ok, `status=${resp?.status()}`);
  }

  // 2. 空库首页空状态显示
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);
  const emptyStates = await page.evaluate(() => document.querySelectorAll(".empty-state").length);
  check("首页空状态展示", emptyStates >= 4, `empty-state count=${emptyStates}`);
  const statsZero = await page.evaluate(() => {
    const nums = [...document.querySelectorAll(".stat-cell .num, .sf-num")].map((e) => e.textContent);
    return nums.every((n) => n === "0" || n === "0%" || n === "0 / 0");
  });
  check("首页统计全 0", statsZero);

  // 3. 完整用户流程：新建项目 → 任务 → 勾选 → 进度 → 刷新
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  await page.click(".btn-primary"); // 新建项目
  await sleep(300);
  await page.type("#np-name", "浏览器验收项目");
  await page.type("#np-desc", "来自浏览器端到端测试");
  await page.click(".modal-foot .btn-primary");
  await sleep(700);
  // 进入项目详情（mini-card 本身是 Link）
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".mini-card")];
    const c = cards.find((x) => x.textContent.includes("浏览器验收项目"));
    if (c) c.click();
  });
  await sleep(900);
  const inDetail = page.url().includes("/projects/");
  check("进入项目详情", inDetail, page.url());
  // 新建任务
  await page.click(".panel-head .btn-add");
  await sleep(300);
  await page.type('input[placeholder="输入任务，回车添加"]', "任务甲");
  await page.keyboard.press("Enter");
  await sleep(600);
  await page.click(".panel-head .btn-add");
  await sleep(300);
  await page.type('input[placeholder="输入任务，回车添加"]', "任务乙");
  await page.keyboard.press("Enter");
  await sleep(600);
  const taskCount = await page.evaluate(() => document.querySelectorAll("[data-od-id='project-tasks'] .task-item").length);
  check("详情页创建 2 任务", taskCount === 2, `count=${taskCount}`);
  // 勾选第一个 → 进度 50%
  await page.click("[data-od-id='project-tasks'] .task-item");
  await sleep(700);
  const progressAfter = await page.evaluate(() => document.querySelector("[data-od-id='project-tasks']")?.closest(".page")?.querySelector(".panel .progress-label b")?.textContent);
  check("勾选后进度 50%", progressAfter === "50%", progressAfter);
  // 刷新（持久化）
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const afterReload = await page.evaluate(() => ({
    tasks: document.querySelectorAll("[data-od-id='project-tasks'] .task-item").length,
    done: document.querySelectorAll("[data-od-id='project-tasks'] .task-item.done").length,
  }));
  check("刷新后数据仍在（2 任务 1 完成）", afterReload.tasks === 2 && afterReload.done === 1, JSON.stringify(afterReload));

  // 4. 首页项目进度联动
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const homeProj = await page.evaluate(() => {
    const li = [...document.querySelectorAll(".proj-list li")].find((x) => x.textContent.includes("浏览器验收项目"));
    return li ? li.textContent : "";
  });
  check("首页项目进度 50% 联动", homeProj.includes("50%"), homeProj.slice(0, 30));

  // 5. 侧边栏待办（未完成任务出现在待办列表；已完成的不显示）
  const sidebarTodo = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".todo-text")].map((e) => e.textContent);
    return items;
  });
  check("侧边栏待办含未完成任务", sidebarTodo.some((t) => t.includes("任务乙")) && !sidebarTodo.some((t) => t.includes("任务甲")), sidebarTodo.join(",").slice(0, 60));

  // 6. 清理测试数据（通过 API）
  const clean = await page.evaluate(async () => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const projects = await call("getProjects");
    for (const p of projects.filter((x) => x.name.includes("浏览器验收项目"))) {
      for (const t of p.tasks) await call("deleteTask", { id: t.id });
      await call("deleteProject", { id: p.id });
    }
    return "cleaned";
  });
  check("清理测试数据", clean === "cleaned");

  await page.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL BROWSER CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
