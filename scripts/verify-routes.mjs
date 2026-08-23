// 全页面验收：12 个路由逐一访问，检查无 404、关键元素存在、桌面档无纵向滚动
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = process.env.APP_URL ?? "http://localhost:3000/";

const ROUTES = [
  { path: "/", title: "首页", expect: ".hero-card" },
  { path: "/today", title: "今天", expect: ".task-groups" },
  { path: "/projects", title: "项目", expect: ".card-grid" },
  { path: "/projects/p1", title: "项目详情", expect: "[data-od-id='project-tasks']" },
  { path: "/learning", title: "学习", expect: ".stat-strip" },
  { path: "/workbench", title: "工作台", expect: ".quick-page" },
  { path: "/review", title: "复盘", expect: ".mini-card" },
  { path: "/inbox", title: "收集箱", expect: ".list-card" },
  { path: "/notes", title: "笔记", expect: ".filter-tabs" },
  { path: "/assets", title: "资产", expect: ".stat-strip" },
  { path: "/ai", title: "AI", expect: ".chat-wrap" },
  { path: "/settings", title: "设置", expect: ".settings-list" },
];

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " → " + detail : ""}`);
};

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const route of ROUTES) {
    const url = BASE.replace(/\/$/, "") + route.path;
    const resp = await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 800));
    const status = resp ? resp.status() : -1;
    const hasExpect = await page.evaluate((sel) => !!document.querySelector(sel), route.expect);
    const noScroll = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
    check(`${route.title} (${route.path})`, status === 200 && hasExpect && noScroll, `status=${status} expect=${hasExpect} scroll=${noScroll}`);
  }

  // 快照截图存档
  for (const route of ROUTES.filter((r) => r.path !== "/")) {
    await page.goto(BASE.replace(/\/$/, "") + route.path, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `_verify/page-${route.path.replace(/[/]/g, "_").replace(/^_/, "home")}.png` });
  }
  await page.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL ROUTES PASS" : `\n${failures} ROUTE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
