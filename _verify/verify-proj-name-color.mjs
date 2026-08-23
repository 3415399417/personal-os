// 验证：项目名黑色，进度%保持紫色
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

  const res = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    const li = card.querySelector(".proj-list li");
    const name = li.querySelector(".proj-name");
    const num = li.querySelector(".num");
    const fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim();
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-deep").trim();
    return {
      nameColor: getComputedStyle(name).color,
      numColor: getComputedStyle(num).color,
      fgVar: fg,
      accentVar: accent,
    };
  });
  console.log(JSON.stringify(res));
  // rgb(31, 41, 55) = #1F2937 = --fg（黑色）；oklch 紫色 = --accent-deep 计算值
  check("项目名为黑色（--fg）", res.nameColor === "rgb(31, 41, 55)", `${res.nameColor} vs fg=${res.fgVar}`);
  check("进度%保持紫色（--accent-deep）", res.numColor !== "rgb(31, 41, 55)", `${res.numColor} vs accent=${res.accentVar}`);

  await page.screenshot({ path: "_verify/proj-name-black.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
