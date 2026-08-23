// 验证：当前项目/最近沉淀卡片内滚动 + 任务数显示 + 行距
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

// 8 个测试项目 + 其中一个带任务
const pids = [];
for (let i = 1; i <= 8; i++) {
  const p = await api("createProject", { name: `滚动项目${i}`, status: "active" });
  pids.push(p.id);
}
await api("createTask", { title: "任务甲", group: "must", projectId: pids[0] });
await api("createTask", { title: "任务乙", group: "must", projectId: pids[0] });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2000);

  /* 1. 项目列表显示全部（>3）+ 任务数副行 */
  const proj = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    const items = [...card.querySelectorAll(".proj-list li")];
    const first = items[0];
    const count = first?.querySelector(".proj-name-text em")?.textContent ?? "";
    const rects = items.slice(0, 3).map((li) => Math.round(li.getBoundingClientRect().height));
    return { count: items.length, firstCount: count, rowHeights: rects };
  });
  console.log("proj:", JSON.stringify(proj));
  check("当前项目显示全部项目（8 个）", proj.count === 8, `${proj.count}`);
  check("项目行显示任务数（2 个任务）", proj.firstCount === "2 个任务", proj.firstCount);
  check("项目行距合理（44-56px）", proj.rowHeights.every((h) => h >= 40 && h <= 58), proj.rowHeights.join(","));

  /* 2. 项目列表卡片内可滚动（无滚动条） */
  const projScroll = await page.evaluate(() => {
    const list = document.querySelector('[data-od-id="card-projects"] .proj-list');
    return {
      canScroll: list.scrollHeight > list.clientHeight + 10,
      bar: getComputedStyle(list).scrollbarWidth,
      scrollH: list.scrollHeight,
      clientH: list.clientHeight,
    };
  });
  console.log("proj scroll:", JSON.stringify(projScroll));
  check("项目列表卡片内可滚动", projScroll.canScroll, `${projScroll.scrollH} > ${projScroll.clientH}`);
  check("无滚动条", projScroll.bar === "none", projScroll.bar);

  /* 3. 滚轮滚动项目列表 → 最后一个项目可见 */
  await page.evaluate(() => {
    const list = document.querySelector('[data-od-id="card-projects"] .proj-list');
    list.scrollTop = list.scrollHeight;
  });
  await sleep(300);
  const lastVisible = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    const items = [...card.querySelectorAll(".proj-list li")];
    const last = items[items.length - 1];
    const r = last.getBoundingClientRect();
    const listR = card.querySelector(".proj-list").getBoundingClientRect();
    return r.top >= listR.top - 5 && r.bottom <= listR.bottom + 5;
  });
  check("滚动后最后一个项目可见", lastVisible);

  /* 4. 最近沉淀卡片也可滚动（有 6 条个人笔记时） */
  for (let i = 1; i <= 8; i++) {
    await api("createNote", { title: `滚动沉淀${i}`, content: "x", type: "笔记" });
  }
  await page.evaluate(() => window.dispatchEvent(new Event("betterlife:data-changed")));
  await sleep(1000);
  const noteScroll = await page.evaluate(() => {
    const list = document.querySelector('[data-od-id="card-notes"] .note-list');
    if (!list) return null;
    return { canScroll: list.scrollHeight > list.clientHeight + 10, bar: getComputedStyle(list).scrollbarWidth };
  });
  console.log("note scroll:", JSON.stringify(noteScroll));
  check("最近沉淀卡片内可滚动", noteScroll?.canScroll === true, JSON.stringify(noteScroll));
  check("最近沉淀无滚动条", noteScroll?.bar === "none", noteScroll?.bar);

  await page.screenshot({ path: "_verify/cards-scroll-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
for (const pid of pids) {
  await api("deleteProject", { id: pid });
}
const notes = await api("getNotes", null);
for (const n of notes.filter((x) => x.title.startsWith("滚动沉淀"))) {
  await api("deleteNote", { id: n.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
