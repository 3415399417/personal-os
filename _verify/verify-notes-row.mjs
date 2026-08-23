// 验证：首页最近沉淀笔记行距（每行高度 ~40px）
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = "http://localhost:3000";

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -> " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);

  const rows = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const items = [...card.querySelectorAll(".note-item")];
    return items.map((li) => {
      const r = li.getBoundingClientRect();
      const b = li.querySelector("b").getBoundingClientRect();
      return {
        h: Math.round(r.height),
        title: li.querySelector("b").textContent.slice(0, 10),
        titleTopOffset: Math.round(b.top - r.top),
      };
    });
  });
  console.log("rows:", JSON.stringify(rows));
  check("每行高度 38-44px（间距舒适）", rows.every((r) => r.h >= 38 && r.h <= 46), rows.map((r) => r.h).join(","));
  check("标题垂直居中", rows.every((r) => r.titleTopOffset >= 10 && r.titleTopOffset <= 18), rows.map((r) => r.titleTopOffset).join(","));

  await page.screenshot({ path: "_verify/notes-row-spacing.png", clip: { x: 430, y: 260, width: 520, height: 300 } });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
