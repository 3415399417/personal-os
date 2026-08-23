// 验证：当前项目行左侧有文件夹图标
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
    const items = [...card.querySelectorAll(".proj-list li")];
    return items.map((li) => {
      const ico = li.querySelector(".proj-ico svg");
      const name = li.querySelector(".proj-name b")?.textContent ?? "";
      const icoRect = ico?.getBoundingClientRect();
      const nameRect = li.querySelector(".proj-name b")?.getBoundingClientRect();
      return {
        name,
        hasIco: !!ico,
        icoSize: icoRect ? `${Math.round(icoRect.width)}x${Math.round(icoRect.height)}` : null,
        icoLeftOfName: icoRect && nameRect ? icoRect.right <= nameRect.left : false,
      };
    });
  });
  console.log(JSON.stringify(res, null, 2));
  check("每个项目行都有图标", res.length > 0 && res.every((r) => r.hasIco));
  check("图标在项目名左侧", res.every((r) => r.icoLeftOfName));
  check("图标尺寸合适", res.every((r) => r.icoSize === "11x11"), res.map((r) => r.icoSize).join(","));

  await page.screenshot({ path: "_verify/proj-ico.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
