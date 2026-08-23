// 验证：笔记页项目笔记文件夹（分组卡片 → 弹窗 → 查看）
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

// 准备：项目 + 2 条项目笔记 + 1 条个人笔记
const proj = await api("createProject", { name: "文件夹测试项目", status: "active" });
const pid = proj.id;
await api("createNote", { title: "[测试]项目笔记甲", content: "甲的内容", type: "笔记", projectId: pid });
await api("createNote", { title: "[测试]项目笔记乙", content: "乙的内容", type: "灵感", projectId: pid });
await api("createNote", { title: "[测试]个人笔记", content: "个人的", type: "笔记" });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/notes`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1800);

  /* 1. 文件夹卡片存在，个人笔记直接显示 */
  const grid = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".mini-card")];
    return cards.map((c) => c.textContent.replace(/\s+/g, " ").trim().slice(0, 50));
  });
  console.log("cards:", JSON.stringify(grid));
  const folderCard = grid.some((t) => t.includes("文件夹测试项目") && t.includes("2 篇"));
  const personalCard = grid.some((t) => t.includes("[测试]个人笔记"));
  check("显示项目文件夹卡片（项目名 + 2 篇）", folderCard);
  check("个人笔记仍单独显示", personalCard);

  /* 2. 点文件夹 → 弹窗列出项目笔记 */
  await page.evaluate(() => {
    [...document.querySelectorAll(".mini-card")].find((c) => c.textContent.includes("文件夹测试项目")).click();
  });
  await sleep(600);
  const folderModal = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("文件夹测试项目"));
    if (!modal) return null;
    const items = [...modal.querySelectorAll(".note-item")].map((li) => li.querySelector("b")?.textContent);
    return { items, hasA: modal.textContent.includes("[测试]项目笔记甲"), hasB: modal.textContent.includes("[测试]项目笔记乙"), noPersonal: !modal.textContent.includes("[测试]个人笔记") };
  });
  console.log("folder modal:", JSON.stringify(folderModal));
  check("文件夹弹窗显示项目笔记甲", folderModal?.hasA && folderModal.items?.includes("[测试]项目笔记甲"));
  check("文件夹弹窗显示项目笔记乙", folderModal?.hasB);
  check("文件夹弹窗不显示个人笔记", folderModal?.noPersonal);

  /* 3. 点击弹窗内笔记 → 查看内容 */
  await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("文件夹测试项目"));
    [...modal.querySelectorAll(".note-item")].find((li) => li.textContent.includes("[测试]项目笔记甲")).click();
  });
  await sleep(600);
  const viewShown = await page.evaluate(() => {
    const modals = [...document.querySelectorAll(".modal")];
    const view = modals.find((m) => m.textContent.includes("甲的内容"));
    return !!view && view.querySelector("button") !== null;
  });
  check("点击条目打开查看弹窗（内容渲染）", viewShown);

  /* 4. 关闭查看 → 关闭文件夹 → 回到列表 */
  await page.evaluate(() => {
    const modals = [...document.querySelectorAll(".modal")];
    const view = modals.find((m) => m.textContent.includes("甲的内容"));
    [...view.querySelectorAll("button")].find((b) => b.textContent.trim() === "关闭").click();
  });
  await sleep(400);
  const back = await page.evaluate(() => {
    const folder = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("文件夹测试项目"));
    return !!folder;
  });
  check("关闭查看后回到文件夹弹窗", back);

  await page.screenshot({ path: "_verify/notes-folder-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
const notes = await api("getNotes", null);
for (const n of notes.filter((x) => x.title.startsWith("[测试]"))) {
  await api("deleteNote", { id: n.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
