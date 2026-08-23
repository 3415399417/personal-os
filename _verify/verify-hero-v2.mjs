import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="focus-card"]');
    if (!card) return { empty: true };
    const left = card.querySelector(".focus-left");
    const right = card.querySelector(".focus-right");
    const lr = left.getBoundingClientRect();
    const rr = right.getBoundingClientRect();
    const flag = getComputedStyle(card.querySelector(".focus-flag"));
    const aiTag = getComputedStyle(card.querySelector(".focus-ai-tag"));
    const pill = getComputedStyle(card.querySelector(".focus-meta-pill"));
    const state = getComputedStyle(card.querySelector(".focus-state-pill"));
    const label = getComputedStyle(card.querySelector(".focus-block-label"));
    const text = getComputedStyle(card.querySelector(".focus-block-text"));
    const btn = getComputedStyle(card.querySelector(".focus-btns .btn-primary"));
    const btnSoft = getComputedStyle(card.querySelector(".focus-btns .btn-soft"));
    return {
      leftW: Math.round(lr.width),
      rightW: Math.round(rr.width),
      leftHasBorder: getComputedStyle(left).borderRightWidth + " " + getComputedStyle(left).borderRightStyle,
      flag: { bg: flag.backgroundColor, color: flag.color, radius: flag.borderRadius, size: flag.width },
      aiTag: { bg: aiTag.backgroundColor, color: aiTag.color, radius: aiTag.borderRadius },
      metaPill: { bg: pill.backgroundColor, radius: pill.borderRadius, fs: pill.fontSize },
      statePill: { bg: state.backgroundColor, color: state.color, radius: state.borderRadius },
      blockLabel: { fs: label.fontSize, color: label.color, fw: label.fontWeight },
      blockText: { fs: text.fontSize, color: text.color, fw: text.fontWeight },
      btnPrimary: { bg: btn.backgroundColor, color: btn.color },
      btnSoft: { bg: btnSoft.backgroundColor, color: btnSoft.color, border: btnSoft.borderTopWidth + " " + btnSoft.borderTopColor },
      rightBlocks: [...right.querySelectorAll(".focus-block-label")].map((s) => s.textContent),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="focus-card"]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8, width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 };
  });
  await page.screenshot({ path: "_verify/hero-focus-v2.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
