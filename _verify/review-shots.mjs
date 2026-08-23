import puppeteer from "puppeteer-core";
import fs from "node:fs";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:3001";
const OUT = "E:\\我的项目\\personal-os\\_verify\\review-shots";
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  ["home", "/"],
  ["today", "/today"],
  ["projects", "/projects"],
  ["notes", "/notes"],
  ["assets", "/assets"],
  ["review", "/review"],
  ["inbox", "/inbox"],
  ["ai", "/ai"],
  ["settings", "/settings"],
  ["stats", "/stats"],
  ["learning", "/learning"],
  ["workbench", "/workbench"],
  ["github", "/github"],
];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

for (const [name, path] of routes) {
  try {
    await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: `${OUT}\\${name}.png` });
    console.log("OK", name);
  } catch (e) {
    console.log("FAIL", name, e.message);
  }
}

// 移动端首页
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
try {
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `${OUT}\\home-mobile.png` });
  console.log("OK home-mobile");
} catch (e) {
  console.log("FAIL home-mobile", e.message);
}

await browser.close();
console.log("DONE");
