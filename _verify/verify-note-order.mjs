// 验证：项目笔记按时间正序（旧在上、新在下）
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

const proj = await api("createProject", { name: "顺序测试项目", status: "active" });
const pid = proj.id;
await api("createNote", { title: "第一篇-最早", content: "x", type: "笔记", projectId: pid });
await sleep(300);
await api("createNote", { title: "第二篇-中间", content: "x", type: "笔记", projectId: pid });
await sleep(300);
await api("createNote", { title: "第三篇-最新", content: "x", type: "笔记", projectId: pid });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1200);

  const order = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    return [...panel.querySelectorAll(".note-item b")].map((b) => b.textContent);
  });
  console.log("order:", JSON.stringify(order));
  check("笔记正序：最早在上、最新在下", order[0] === "第一篇-最早" && order[1] === "第二篇-中间" && order[2] === "第三篇-最新", order.join(" -> "));
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

await api("deleteProject", { id: pid });
const notes = await api("getNotes", null);
for (const n of notes.filter((x) => x.title.startsWith("第") && x.title.includes("篇"))) {
  await api("deleteNote", { id: n.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
