// 验证：最近沉淀只显示个人笔记，项目笔记只在项目详情页
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

// 准备：项目 + 项目笔记 + 个人笔记
const proj = await api("createProject", { name: "沉淀隔离项目", status: "active" });
const pid = proj.id;
await api("createNote", { title: "[测试]项目内笔记", content: "x", type: "笔记", projectId: pid });
await api("createNote", { title: "[测试]个人沉淀笔记", content: "x", type: "笔记" });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* 1. 首页最近沉淀：显示个人笔记，不显示项目笔记 */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);
  const home = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const txt = card ? card.textContent : "";
    return {
      hasPersonal: txt.includes("[测试]个人沉淀笔记"),
      hasProj: txt.includes("[测试]项目内笔记"),
    };
  });
  check("最近沉淀显示个人笔记", home.hasPersonal);
  check("最近沉淀不显示项目笔记", !home.hasProj, JSON.stringify(home));

  /* 2. 项目详情页：显示项目笔记 */
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);
  const detail = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const txt = panel ? panel.textContent : "";
    return {
      hasProj: txt.includes("[测试]项目内笔记"),
      hasPersonal: txt.includes("[测试]个人沉淀笔记"),
    };
  });
  check("项目详情显示项目笔记", detail.hasProj);
  check("项目详情不显示个人笔记", !detail.hasPersonal, JSON.stringify(detail));

  /* 3. /notes 全量：两者都显示 */
  await page.goto(`${BASE}/notes`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);
  const notesPage = await page.evaluate(() => {
    const txt = document.body.textContent;
    return {
      hasProj: txt.includes("[测试]项目内笔记"),
      hasPersonal: txt.includes("[测试]个人沉淀笔记"),
    };
  });
  check("笔记页全量：项目笔记可见", notesPage.hasProj);
  check("笔记页全量：个人笔记可见", notesPage.hasPersonal);

  await page.screenshot({ path: "_verify/notes-separation.png" });
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
