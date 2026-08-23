// 閲嶆柊鎴浘锛堟洿绋崇殑绛夊緟锛氬弻閲嶇瓑寰?+ 缂栬瘧棰勭儹锛夛紝鐒跺悗鍍忕礌瀵规瘮
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
if (!EDGE) { console.error("Edge not found"); process.exit(1); }

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "_verify");
await mkdir(OUT_DIR, { recursive: true });
const PROTOTYPE = "file:///C:/Users/34153/Desktop/Web-Prototype/personal-os-home.html";
const APP = process.env.APP_URL ?? "http://localhost:3000/";
const vp = { name: process.argv[2] ?? "laptop-1366x768", w: 1366, h: 768 };
const m = vp.name.match(/(\d+)x(\d+)/);
vp.w = Number(m[1]); vp.h = Number(m[2]);

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

try {
  // 棰勭儹 app锛堣Е鍙戠紪璇戯級
  const warm = await browser.newPage();
  await warm.setViewport({ width: vp.w, height: vp.h });
  await warm.goto(APP, { waitUntil: "networkidle0", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 3000));
  await warm.close();

  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
  await page.goto(PROTOTYPE, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: join(OUT_DIR, `prototype-${vp.name}.png`) });
  await page.goto(APP, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: join(OUT_DIR, `app-${vp.name}.png`) });
  await page.close();

  // 鍍忕礌瀵规瘮
  const page2 = await browser.newPage();
  const png1 = readFileSync(join(OUT_DIR, `prototype-${vp.name}.png`)).toString("base64");
  const png2 = readFileSync(join(OUT_DIR, `app-${vp.name}.png`)).toString("base64");
  const res = await page2.evaluate(async ({ png1, png2 }) => {
    const load = (b64) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = "data:image/png;base64," + b64;
    });
    const [a, b] = await Promise.all([load(png1), load(png2)]);
    const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(a, 0, 0); const d1 = ctx.getImageData(0, 0, w, h).data;
    ctx.drawImage(b, 0, 0); const d2 = ctx.getImageData(0, 0, w, h).data;
    let diffCount = 0, maxDiff = 0, minX = w, minY = h, maxX = 0, maxY = 0;
    const GRID = 8, gw = Math.ceil(w / GRID), gh = Math.ceil(h / GRID);
    const cells = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    const counts = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    const stride = 2;
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        const i = (y * w + x) * 4;
        const d = Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]);
        if (d > maxDiff) maxDiff = d;
        const gx = Math.min(GRID - 1, Math.floor(x / gw)), gy = Math.min(GRID - 1, Math.floor(y / gh));
        counts[gy][gx]++;
        if (d > 24) {
          diffCount++;
          cells[gy][gx]++;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    const sampled = Math.ceil(w / stride) * Math.ceil(h / stride);
    return {
      pct: (100 * diffCount / sampled).toFixed(3) + "%",
      maxDiff, bbox: `x[${minX}..${maxX}] y[${minY}..${maxY}]`,
      grid: cells.map((row, gy) => row.map((c, gx) => (100 * c / Math.max(1, counts[gy][gx])).toFixed(1)).join(" ")),
    };
  }, { png1, png2 });
  console.log(`${vp.name} diff: ${res.pct} maxDiff=${res.maxDiff} bbox=${res.bbox}`);
  res.grid.forEach((r, i) => console.log(`y${i}: ${r}`));
  await page2.close();
} finally {
  await browser.close();
}
