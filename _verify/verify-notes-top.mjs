// 验证：首页最近沉淀条目从顶部排列（不居中）
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

  const layout = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const head = card.querySelector(".card-head").getBoundingClientRect();
    const list = card.querySelector(".note-list");
    const firstItem = list ? list.querySelector("li")?.getBoundingClientRect() : null;
    return {
      headBottom: Math.round(head.bottom),
      firstTop: firstItem ? Math.round(firstItem.top) : null,
      gap: firstItem ? Math.round(firstItem.top - head.bottom) : null,
      listJustify: list ? getComputedStyle(list).justifyContent : null,
    };
  });
  console.log("layout:", JSON.stringify(layout));
  check("列表 justify-content: flex-start", layout.listJustify === "flex-start", layout.listJustify);
  check("条目紧贴标题下方（不居中）", layout.gap !== null && layout.gap <= 15, `gap=${layout.gap}px`);

  await page.screenshot({ path: "_verify/notes-top-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
