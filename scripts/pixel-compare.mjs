// 像素级对比：原型截图 vs App 截图（canvas getImageData，无 CORS 问题）
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
if (!EDGE) { console.error("Edge not found"); process.exit(1); }

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "_verify");
const viewports = [
  { name: "desktop-1440x900", w: 1440, h: 900 },
  { name: "laptop-1366x768", w: 1366, h: 768 },
  { name: "wide-1920x1080", w: 1920, h: 1080 },
];

const browser = await puppeteer.launch({
  executablePath: EDGE, headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  for (const vp of viewports) {
    const png1 = readFileSync(join(OUT_DIR, `prototype-${vp.name}.png`)).toString("base64");
    const png2 = readFileSync(join(OUT_DIR, `app-${vp.name}.png`)).toString("base64");
    const result = await page.evaluate(async ({ png1, png2, vp }) => {
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
      const stride = 2;
      for (let y = 0; y < h; y += stride) {
        for (let x = 0; x < w; x += stride) {
          const i = (y * w + x) * 4;
          const d = Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]);
          if (d > maxDiff) maxDiff = d;
          if (d > 24) {
            diffCount++;
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      const sampled = Math.ceil(w / stride) * Math.ceil(h / stride);
      return {
        size: `${w}x${h}`, diffCount, sampled,
        pct: (100 * diffCount / sampled).toFixed(3) + "%",
        maxDiff, bbox: diffCount ? `x[${minX}..${maxX}] y[${minY}..${maxY}]` : "none",
      };
    }, { png1, png2, vp });
    console.log(`${vp.name}: ${JSON.stringify(result)}`);
  }
  await page.close();
} finally {
  await browser.close();
}
