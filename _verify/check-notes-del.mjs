// 检查：最近沉淀卡片的 hover 删除按钮是否显示、点击是否删除
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
  await sleep(1000);

  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    if (!card) return { err: "no card" };
    const items = [...card.querySelectorAll(".note-item")];
    return items.map((li) => {
      const del = li.querySelector(".task-del");
      const st = del ? getComputedStyle(del) : null;
      return {
        title: li.querySelector("b")?.textContent ?? "",
        hasDel: !!del,
        opacity: st ? st.opacity : null,
      };
    });
  });
  console.log("items:", JSON.stringify(info, null, 2));

  // hover 第一项，看按钮是否浮现
  const pos = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const li = card.querySelector(".note-item");
    const r = li.getBoundingClientRect();
    return { x: r.x + 30, y: r.y + r.height / 2 };
  });
  if (pos) {
    await page.mouse.move(pos.x, pos.y);
    await sleep(500);
    const hovered = await page.evaluate(() => {
      const card = document.querySelector('[data-od-id="card-notes"]');
      const li = card.querySelector(".note-item");
      const del = li.querySelector(".task-del");
      return del ? getComputedStyle(del).opacity : "no btn";
    });
    console.log("after hover, del opacity:", hovered);
  }

  await page.screenshot({ path: "_verify/notes-card-current.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
