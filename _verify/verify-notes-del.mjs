// 验证：最近沉淀删除按钮常显 + 点击删除生效（用测试笔记，不动用户数据）
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

// 创建测试笔记（最新，会排在最前）
const note = await api("createNote", { title: "[测试]待删除笔记", content: "x", type: "笔记" });
const nid = note.id;
console.log("test note:", nid);

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);

  /* 1. 删除按钮常显（不用 hover） */
  const visible = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const li = [...card.querySelectorAll(".note-item")].find((x) => x.textContent.includes("[测试]待删除笔记"));
    const del = li?.querySelector(".note-del");
    return del ? getComputedStyle(del).opacity : "no btn";
  });
  check("删除按钮常显（opacity=1）", visible === "1", String(visible));

  /* 2. 按钮不遮挡时间文字 */
  const layout = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const li = [...card.querySelectorAll(".note-item")].find((x) => x.textContent.includes("[测试]待删除笔记"));
    const em = li.querySelector("em").getBoundingClientRect();
    const del = li.querySelector(".note-del").getBoundingClientRect();
    return { emRight: Math.round(em.right), delLeft: Math.round(del.left), ok: em.right <= del.left };
  });
  check("时间与删除按钮不重叠", layout.ok, JSON.stringify(layout));

  /* 3. 点击删除 → 条目消失 + 数据库删除 */
  await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const li = [...card.querySelectorAll(".note-item")].find((x) => x.textContent.includes("[测试]待删除笔记"));
    li.querySelector(".note-del").click();
  });
  await sleep(900);
  const gone = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    return !card.textContent.includes("[测试]待删除笔记");
  });
  check("点击删除后条目消失", gone);
  const notes = await api("getNotes", null);
  check("数据库已删除该笔记", !notes.some((n) => n.id === nid));

  await page.screenshot({ path: "_verify/notes-del-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
