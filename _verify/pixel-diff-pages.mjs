// 逐页像素对比 cmp-before/ vs cmp-after/，输出差异百分比
import puppeteer from "puppeteer-core";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = join(dirname(fileURLToPath(import.meta.url)), "..", "_verify");

const names = readdirSync(join(BASE, "cmp-before")).filter((f) => f.endsWith(".png"));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();

let worst = 0;
for (const name of names) {
  const before = readFileSync(join(BASE, "cmp-before", name)).toString("base64");
  const after = readFileSync(join(BASE, "cmp-after", name)).toString("base64");
  const diff = await page.evaluate(async ({ before, after }) => {
    const load = (b64) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = "data:image/png;base64," + b64;
    });
    const [a, b] = await Promise.all([load(before), load(after)]);
    const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    ctx.drawImage(a, 0, 0);
    const da = ctx.getImageData(0, 0, w, h).data;
    ctx.drawImage(b, 0, 0);
    const db = ctx.getImageData(0, 0, w, h).data;
    let diffPx = 0;
    const total = w * h;
    for (let i = 0; i < total; i++) {
      const o = i * 4;
      if (Math.abs(da[o] - db[o]) > 12 || Math.abs(da[o + 1] - db[o + 1]) > 12 || Math.abs(da[o + 2] - db[o + 2]) > 12) diffPx++;
    }
    return (diffPx / total) * 100;
  }, { before, after });
  const pct = diff.toFixed(3);
  worst = Math.max(worst, diff);
  console.log(`${pct.padStart(8)}%  ${name}`);
}
await browser.close();
console.log(`\n最差差异: ${worst.toFixed(3)}%（0.000% = 完全一致）`);
