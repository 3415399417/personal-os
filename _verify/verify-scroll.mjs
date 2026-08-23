// 验证：任务展开后 page-scroll 可滚动（滚轮）且无滚动条，项目笔记可见
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

const proj = await api("createProject", { name: "滚动测试项目", status: "active" });
const pid = proj.id;
for (let i = 1; i <= 10; i++) {
  await api("createTask", { title: `滚动任务${i}`, group: "must", projectId: pid });
}
for (let i = 1; i <= 5; i++) {
  await api("createNote", { title: `滚动笔记${i}`, content: "x", type: "笔记", projectId: pid });
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 680 });
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2000);

  // 展开任务
  await page.evaluate(() => {
    [...document.querySelectorAll(".collapse-toggle")].find((b) => b.textContent.includes("展开全部")).click();
  });
  await sleep(500);

  // 1. 容器可滚动（内容超出）
  const scrollable = await page.evaluate(() => {
    const sc = document.querySelector(".page-scroll");
    return {
      clientH: sc.clientHeight,
      scrollH: sc.scrollHeight,
      canScroll: sc.scrollHeight > sc.clientHeight + 10,
    };
  });
  console.log("scroll:", JSON.stringify(scrollable));
  check("任务展开后内容超出、可上下滚动", scrollable.canScroll, `${scrollable.scrollH} > ${scrollable.clientH}`);

  // 2. 无滚动条（webkit width=0）
  const noBar = await page.evaluate(() => {
    const sc = document.querySelector(".page-scroll");
    const cs = getComputedStyle(sc);
    return {
      webkit: cs.scrollbarWidth, // "none" 或 "auto"
      // 检查内部是否有可见滚动条占位：对比 clientWidth 与 offsetWidth
      offsetW: sc.offsetWidth,
      clientW: sc.clientWidth,
    };
  });
  console.log("bar:", JSON.stringify(noBar));
  check("滚动条已隐藏（scrollbar-width: none）", noBar.webkit === "none", noBar.webkit);
  check("无滚动条占位宽度", noBar.offsetW - noBar.clientW <= 1, `diff=${noBar.offsetW - noBar.clientW}`);

  // 3. 滚轮滚动后项目笔记可见
  const notesPanel = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const r = panel.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), visible: r.top < 680 && r.bottom > 0 };
  });
  console.log("notes before scroll:", JSON.stringify(notesPanel));
  check("初始项目笔记在视口外（被遮挡，需滚动）", !notesPanel.visible, `top=${notesPanel.top}`);

  // 模拟滚轮滚动
  await page.mouse.move(800, 400);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel({ deltaY: 300 });
    await sleep(150);
  }
  await sleep(400);
  const notesAfter = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const r = panel.getBoundingClientRect();
    return { top: Math.round(r.top), visible: r.top < 680 && r.bottom > 0 };
  });
  console.log("notes after scroll:", JSON.stringify(notesAfter));
  check("滚轮滚动后项目笔记可见", notesAfter.visible, `top=${notesAfter.top}`);

  await page.screenshot({ path: "_verify/scroll-noscrollbar.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

await api("deleteProject", { id: pid });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
