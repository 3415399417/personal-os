// 截图：项目详情页笔记查看弹窗（美化后）
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = "http://localhost:3000";

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/projects/cmt1ftzkj001fr4uvtlz0hr88`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1200);

  // 打开第一条项目笔记
  const opened = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const item = panel?.querySelector(".note-item");
    if (!item) return false;
    item.click();
    return true;
  });
  console.log("note opened:", opened);
  await sleep(800);

  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector(".modal");
    if (!modal) return null;
    const rect = modal.getBoundingClientRect();
    return {
      w: Math.round(rect.width),
      hasBadge: !!modal.querySelector(".badge"),
      hasIco: !!modal.querySelector(".note-view-ico"),
      hasBody: !!modal.querySelector(".note-view-body"),
      hasCode: !!modal.querySelector("code"),
      footText: modal.querySelector(".modal-foot")?.textContent ?? "",
    };
  });
  console.log("modal:", JSON.stringify(modalInfo));

  await page.screenshot({ path: "_verify/note-view-beautified.png", clip: { x: 0, y: 0, width: 700, height: 700 } });
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await browser.close();
}
