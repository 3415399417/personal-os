// 验证：最近沉淀最多 6 条 + 点击查看；当前项目最多 6 个 + 总数提示
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

// 准备：8 个测试项目 + 8 条个人笔记
const pids = [];
for (let i = 1; i <= 8; i++) {
  const p = await api("createProject", { name: `上限项目${i}`, status: "active" });
  pids.push(p.id);
}
for (let i = 1; i <= 8; i++) {
  await api("createNote", { title: `上限笔记${i}`, content: `这是上限笔记${i}的正文内容`, type: "笔记" });
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);

  /* 1. 最近沉淀最多 6 条 */
  const noteCount = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    return card.querySelectorAll(".note-item").length;
  });
  check("最近沉淀最多显示 6 条", noteCount === 6, `${noteCount}`);

  /* 2. 点击笔记 → 查看弹窗（内容渲染） */
  await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    [...card.querySelectorAll(".note-item")].find((li) => li.textContent.includes("上限笔记8")).click();
  });
  await sleep(600);
  const viewOk = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("上限笔记8"));
    return modal ? modal.textContent.includes("这是上限笔记8的正文内容") : false;
  });
  check("点击笔记弹出查看（正文渲染）", viewOk);
  // 关闭
  await page.evaluate(() => {
    [...document.querySelectorAll(".modal button")].find((b) => b.textContent.trim() === "关闭").click();
  });
  await sleep(400);

  /* 3. 当前项目最多 6 个 + 总数提示 */
  const projInfo = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    const items = card.querySelectorAll(".proj-list li").length;
    const moreLink = card.querySelector('[data-od-id="projects-more"]')?.textContent ?? "";
    return { items, moreLink };
  });
  console.log("proj:", JSON.stringify(projInfo));
  check("当前项目最多显示 6 个", projInfo.items === 6, `${projInfo.items}`);
  check("查看全部带总数（共 12 个）", projInfo.moreLink.includes("查看全部 · 12"), projInfo.moreLink);

  /* 4. 项目列表卡片内滚动仍正常 */
  const scroll = await page.evaluate(() => {
    const list = document.querySelector('[data-od-id="card-projects"] .proj-list');
    return list.scrollHeight > list.clientHeight + 10;
  });
  check("项目卡片内滚动可用", scroll);

  await page.screenshot({ path: "_verify/limit6-final.png" });
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
for (const n of notes.filter((x) => x.title.startsWith("上限笔记"))) {
  await api("deleteNote", { id: n.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
