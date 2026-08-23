// 瑙嗚瀵规瘮锛欻TML 鍘熷瀷 vs Next.js 棣栭〉锛堝悓瑙嗗彛銆佸悓绛夊緟鏃堕棿锛夛紝杈撳嚭骞舵帓鎴浘
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
if (!EDGE) {
  console.error("Edge not found");
  process.exit(1);
}

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "_verify");
await mkdir(OUT_DIR, { recursive: true });

const PROTOTYPE = "file:///C:/Users/34153/Desktop/Web-Prototype/personal-os-home.html";
const APP = process.env.APP_URL ?? "http://localhost:3000/";
const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1366x768", width: 1366, height: 768 },
  { name: "wide-1920x1080", width: 1920, height: 1080 },
];

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });

    await page.goto(PROTOTYPE, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500)); // 绛夎繘搴︽潯鍔ㄧ敾瀹屾垚
    await page.screenshot({ path: join(OUT_DIR, `prototype-${vp.name}.png`) });

    await page.goto(APP, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: join(OUT_DIR, `app-${vp.name}.png`) });

    await page.close();
    console.log(`captured ${vp.name}`);
  }

  // 棰濆锛氬 app 璺戜竴娆?DOM 缁撴瀯鎶芥煡锛堢被鍚嶄笌鍘熷瀷鍏抽敭绫绘槸鍚﹂綈鍏級
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(APP, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const report = await page.evaluate(() => {
    const required = [
      "app", "sidebar", "sidebar-brand", "brand-mark", "brand-text",
      "sidebar-scroll", "greet-card", "greet-text", "greet-top", "greet-date", "greet-week",
      "greet-title", "greet-art", "side-card", "side-stats", "side-title",
      "stat-feature", "sf-num", "sf-label", "stat-grid", "stat-cell",
      "side-todos", "side-head", "btn-add", "todo-list", "todo-item", "todo-check", "todo-text", "todo-input-row",
      "side-reminders", "remind-list", "remind-item", "remind-time",
      "sidebar-foot", "sf-copy", "foot-icons", "icon-btn",
      "main", "topbar", "topbar-inner", "menu-btn", "topnav", "nav-link",
      "topbar-right", "search", "bell-wrap", "bell-btn", "bell-dot", "bell-pop", "bell-pop-head", "avatar",
      "content", "hero-card", "hero-scene", "hero-copy", "hero-title", "hero-sub",
      "hero-body", "focus-card", "focus-top", "card-eyebrow", "tag",
      "focus-grid", "focus-left", "focus-title", "focus-desc", "focus-meta",
      "focus-right", "focus-list", "row-inline", "state", "focus-btns", "btn", "btn-primary", "btn-soft",
      "grid-row", "card", "card-head", "card-title", "card-note", "link-more", "card-art",
      "exec-list", "exec-item", "exec-ico", "exec-count",
      "proj-list", "proj-line", "progress", "progress-meta",
      "res-grid", "res-cell",
      "study-progress", "study-stats", "study-plans",
      "note-list", "note-item", "note-ico",
      "life-list", "life-item", "life-dot", "life-ok",
      "quick-grid", "quick-item", "qi-ico",
      "ai-card", "ai-head", "ai-art", "ai-tags", "ai-tag", "btn-block",
      "asset-list", "asset-item", "asset-ico", "num",
    ];
    const missing = required.filter((c) => !document.querySelector(`.${c}`));
    const svgCount = document.querySelectorAll("svg").length;
    return { missing, svgCount, bodyScrollHeight: document.body.scrollHeight, viewport: window.innerHeight };
  });
  console.log("DOM check:", JSON.stringify(report, null, 2));
  await page.close();
} finally {
  await browser.close();
}
