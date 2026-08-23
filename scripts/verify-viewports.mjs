// 9 档视口矩阵验证：无横向滚动 / 桌面档无纵向滚动 / 内容截断检测 / 截图存档
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const VIEWPORTS = [
  { name: "mobile-compact", width: 360, height: 800, desktop: false },
  { name: "mobile-standard", width: 390, height: 844, desktop: false },
  { name: "mobile-large", width: 430, height: 932, desktop: false },
  { name: "foldable-small-tablet", width: 600, height: 960, desktop: false },
  { name: "tablet-portrait", width: 820, height: 1180, desktop: false },
  { name: "tablet-landscape", width: 1024, height: 768, desktop: true },
  { name: "laptop", width: 1366, height: 768, desktop: true },
  { name: "desktop", width: 1440, height: 900, desktop: true },
  { name: "wide", width: 1920, height: 1080, desktop: true },
];

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
if (!EDGE) {
  console.error("Edge not found");
  process.exit(1);
}

const BASE = process.argv[2] ?? "http://localhost:3000/";
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "_verify");
await mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

let failures = 0;
const summary = [];

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(BASE, { waitUntil: "networkidle0", timeout: 30000 });
    // 等进度条动画完成
    await new Promise((r) => setTimeout(r, 1200));

    const check = await page.evaluate(() => {
      const doc = document.documentElement;
      const horizontalOverflow = doc.scrollWidth > window.innerWidth + 1;
      const verticalOverflow = doc.scrollHeight > window.innerHeight + 1;
      // 是否有可滚动祖先（滚动容器内的内容溢出属正常滚动）
      const inScrollable = (el) => {
        let p = el.parentElement;
        while (p) {
          const s = window.getComputedStyle(p);
          if (s.overflowY === "auto" || s.overflowY === "scroll" || s.overflow === "auto" || s.overflow === "scroll") return true;
          p = p.parentElement;
        }
        return false;
      };
      // 内容截断检测：仅检测真正 overflow:hidden 的元素；跳过 line-clamp（-webkit-box 或
      // -webkit-line-clamp 非 none）、滚动容器内元素、aria-hidden 装饰元素自身，
      // 以及"溢出全部来自装饰元素"的容器
      let clipped = 0;
      const clippedDetails = [];
      const walker = document.querySelectorAll(".overflow-hidden");
      for (const el of walker) {
        const style = window.getComputedStyle(el);
        const reallyHidden = style.overflow === "hidden" || style.overflowY === "hidden" || style.overflowX === "hidden";
        if (!reallyHidden) continue;
        if (style.display === "-webkit-box" || style.webkitLineClamp !== "none") continue;
        if (inScrollable(el)) continue;
        if (el.hasAttribute("aria-hidden")) continue;
        const overflowChildren = [...el.querySelectorAll("*")].filter(
          (c) => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1,
        );
        const allDecorative =
          overflowChildren.length > 0 &&
          overflowChildren.every((c) => c.closest("[aria-hidden]") !== null);
        if (allDecorative) continue;
        if (el.scrollHeight > el.clientHeight + 1) {
          clipped++;
          clippedDetails.push(`H:${el.tagName}.${String(el.className).slice(0, 70)} (${el.clientHeight}/${el.scrollHeight})`);
        }
        if (el.scrollWidth > el.clientWidth + 1) {
          clipped++;
          clippedDetails.push(`W:${el.tagName}.${String(el.className).slice(0, 70)} (${el.clientWidth}/${el.scrollWidth})`);
        }
      }
      // 横向溢出源定位
      let overflowSource = "";
      if (horizontalOverflow) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1 || r.left < -1) {
            overflowSource = `${el.tagName}.${String(el.className).slice(0, 70)} right=${Math.round(r.right)}`;
            break;
          }
        }
      }
      // 布局明细：各主 section 尺寸
      const sections = [];
      for (const el of document.querySelectorAll("main > section")) {
        sections.push(`${el.className.slice(0, 30)}: ${el.clientHeight}/${el.scrollHeight}`);
      }
      // hero 内部明细
      const heroDetails = [];
      const hero = document.querySelector("main > section");
      if (hero) {
        for (const el of hero.querySelectorAll("div, ul")) {
          if (el.getBoundingClientRect().height < 400 && el.scrollHeight - el.clientHeight > 2) {
            heroDetails.push(`${el.className.slice(0, 40)}: ${el.clientHeight}/${el.scrollHeight}`);
          }
        }
      }
      return { horizontalOverflow, verticalOverflow, clipped, clippedDetails, overflowSource, sections, heroDetails, bodyScroll: doc.scrollHeight };
    });

    const file = join(OUT_DIR, `${vp.name}-${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: file, fullPage: false });

    const problems = [];
    if (check.horizontalOverflow) problems.push(`横向溢出 (${check.overflowSource})`);
    if (vp.desktop && check.verticalOverflow) problems.push("纵向滚动（桌面档要求一屏）");
    if (check.clipped > 0) problems.push(`内容截断 ${check.clipped} 处: ${check.clippedDetails.slice(0, 3).join("; ")}`);
    const ok = problems.length === 0;
    if (!ok) failures++;
    summary.push({ viewport: vp.name, size: `${vp.width}x${vp.height}`, ok, problems });
    console.log(`${ok ? "PASS" : "FAIL"} ${vp.name} ${vp.width}x${vp.height}${problems.length ? " → " + problems.join(" | ") : ""}  [${file}]`);
    if (!ok && check.sections.length) console.log("   sections:", check.sections.join(" | "));
    if (!ok && check.heroDetails.length) console.log("   hero:", check.heroDetails.join(" | "));
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL VIEWPORTS PASS" : `\n${failures} VIEWPORT(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
