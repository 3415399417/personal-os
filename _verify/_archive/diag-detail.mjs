// 诊断：详情页渲染 + 控制台错误
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
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 300)));

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/projects/cmt1ftzkj001fr4uvtlz0hr88`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);

  const body = await page.evaluate(() => document.body.textContent.slice(0, 300));
  console.log("body head:", JSON.stringify(body));

  const panels = await page.evaluate(() => {
    const heads = [...document.querySelectorAll(".panel-title")].map((h) => h.textContent);
    const row = document.querySelector(".proj-path-row");
    return { heads, hasRow: !!row, rowText: row ? row.textContent : null };
  });
  console.log("panels:", JSON.stringify(panels));
  console.log("console errors:", errors.length ? errors.join("\n---\n") : "none");
} catch (e) {
  console.log("ERR", e.message);
} finally {
  await browser.close();
}
