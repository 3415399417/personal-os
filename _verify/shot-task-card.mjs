import puppeteer from "puppeteer-core";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileUrl = "file:///" + path.join(__dirname, "task-card-design.html").replace(/\\/g, "/");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 900 });
  await page.goto(fileUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));

  const info = await page.evaluate(() => {
    const card = document.querySelector(".task-card");
    const cs = getComputedStyle(card);
    const badge = getComputedStyle(document.querySelector(".top-badge"));
    const mainT = getComputedStyle(document.querySelector(".main-title"));
    const subT = getComputedStyle(document.querySelector(".sub-title"));
    const meta = getComputedStyle(document.querySelector(".meta-text"));
    const track = getComputedStyle(document.querySelector(".progress-track"));
    const fill = getComputedStyle(document.querySelector(".progress-fill"));
    const num = getComputedStyle(document.querySelector(".progress-num"));
    const div = getComputedStyle(document.querySelector(".divider"));
    const block = getComputedStyle(document.querySelector(".subtask-block"));
    const label = getComputedStyle(document.querySelector(".subtask-label"));
    const name = getComputedStyle(document.querySelector(".subtask-name"));
    const arrow = getComputedStyle(document.querySelector(".subtask-arrow"));
    const cBtn = getComputedStyle(document.querySelector(".btn-continue"));
    const sBtn = getComputedStyle(document.querySelector(".btn-submit"));
    return {
      card: { w: cs.width, bg: cs.backgroundColor, radius: cs.borderRadius, pad: cs.padding, shadow: cs.boxShadow },
      badge: { bg: badge.backgroundColor, color: badge.color, fs: badge.fontSize, fw: badge.fontWeight, pad: badge.padding, radius: badge.borderRadius },
      mainTitle: { fs: mainT.fontSize, fw: mainT.fontWeight, color: mainT.color },
      subTitle: { fs: subT.fontSize, fw: subT.fontWeight, color: subT.color },
      meta: { fs: meta.fontSize, color: meta.color },
      track: { w: track.width, h: track.height, bg: track.backgroundColor, radius: track.borderRadius },
      fill: { w: fill.width, bg: fill.backgroundColor },
      num: { fs: num.fontSize, fw: num.fontWeight, color: num.color },
      divider: { border: div.borderTopWidth + " " + div.borderTopStyle + " " + div.borderTopColor, margin: div.margin },
      block: { bg: block.backgroundColor, radius: block.borderRadius, pad: block.padding, justify: block.justifyContent },
      label: { fs: label.fontSize, fw: label.fontWeight, color: label.color },
      name: { fs: name.fontSize, fw: name.fontWeight, color: name.color },
      arrow: { fs: arrow.fontSize, color: arrow.color },
      btnContinue: { bg: cBtn.backgroundColor, border: cBtn.borderTopWidth + " " + cBtn.borderTopStyle + " " + cBtn.borderTopColor, radius: cBtn.borderRadius, fs: cBtn.fontSize, color: cBtn.color, pad: cBtn.padding },
      btnSubmit: { bg: sBtn.backgroundColor, border: sBtn.borderTopWidth + " " + sBtn.borderTopStyle + " " + sBtn.borderTopColor, radius: sBtn.borderRadius, fs: sBtn.fontSize, color: sBtn.color, pad: sBtn.padding },
      actionRow: { justify: getComputedStyle(document.querySelector(".action-row")).justifyContent, gap: getComputedStyle(document.querySelector(".action-row")).gap },
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const rect = await page.evaluate(() => {
    const el = document.querySelector(".task-card");
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 24, y: Math.round(r.y) - 24, width: Math.round(r.width) + 48, height: Math.round(r.height) + 48 };
  });
  await page.screenshot({ path: "_verify/task-card-design.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
