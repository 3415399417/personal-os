// 截图：项目笔记列表行距优化效果（临时项目 + 多条笔记）
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proj = await api("createProject", { name: "行距预览项目", status: "active" });
const pid = proj.id;
for (let i = 1; i <= 6; i++) {
  await api("createNote", { title: `示例笔记 ${i}`, content: "内容", type: "笔记", projectId: pid });
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1200);

  const info = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const items = [...panel.querySelectorAll(".note-item")];
    const heights = items.map((li) => Math.round(li.getBoundingClientRect().height));
    return { count: items.length, heights, panelTop: Math.round(panel.getBoundingClientRect().top) };
  });
  console.log("note rows:", JSON.stringify(info));

  await page.screenshot({
    path: "_verify/note-list-spacing.png",
    clip: { x: 240, y: info.panelTop - 30, width: 1180, height: 420 },
  });
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await browser.close();
}

// 清理
await api("deleteProject", { id: pid });
const notes = await api("getNotes", null);
for (const n of notes.filter((x) => x.title.startsWith("示例笔记"))) {
  await api("deleteNote", { id: n.id });
}
