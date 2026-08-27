// 全页面截图（before/after 对比用）：拍 16 个页面到 _verify/cmp-<tag>/
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const TAG = process.env.CMP_TAG ?? "before";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "_verify", "cmp-" + TAG);
await mkdir(OUT, { recursive: true });

const PAGES = ["/", "/today", "/projects", "/projects/cmt0000000000000000test", "/review", "/notes", "/settings", "/space", "/assets", "/resources/sop", "/stats", "/github", "/inbox", "/learning", "/ai", "/workbench"];

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

let fail = 0;
for (const p of PAGES) {
  try {
    await page.goto("http://127.0.0.1:3000" + p, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 900));
    const name = p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_");
    await page.screenshot({ path: join(OUT, name + ".png") });
    console.log("OK  " + name);
  } catch (e) {
    fail++;
    console.log("FAIL " + p + " → " + String(e).slice(0, 100));
  }
}
await browser.close();
console.log(fail === 0 ? "ALL SHOTS DONE" : fail + " FAILED");
process.exit(fail === 0 ? 0 : 1);
