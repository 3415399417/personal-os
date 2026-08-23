// 验证：项目行字号与图标放大
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
    const name = li.querySelector(".proj-name b");
    const num = li.querySelector(".num");
    const ico = li.querySelector(".proj-ico");
    const icoSvg = li.querySelector(".proj-ico svg");
    const nameFs = parseFloat(getComputedStyle(name).fontSize);
    const numFs = parseFloat(getComputedStyle(num).fontSize);
    return {
      nameFs,
      numFs,
      icoBox: `${Math.round(ico.getBoundingClientRect().width)}x${Math.round(ico.getBoundingClientRect().height)}`,
      icoSvg: `${Math.round(icoSvg.getBoundingClientRect().width)}x${Math.round(icoSvg.getBoundingClientRect().height)}`,
    };
  });
  console.log(JSON.stringify(res));
  check("项目名字号 = 13px", res.nameFs === 13, `${res.nameFs}px`);
  check("进度字号 = 12px", res.numFs === 12, `${res.numFs}px`);
  check("图标容器 22x22", res.icoBox === "22x22", res.icoBox);
  check("图标图形 14x14", res.icoSvg === "14x14", res.icoSvg);

  await page.screenshot({ path: "_verify/proj-ico-big.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
