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
    const cs = getComputedStyle(card);
    const rect = card.getBoundingClientRect();
    const badge = card.querySelector(".focus-badge");
    const meta = card.querySelector(".focus-meta");
    const subtask = card.querySelector(".focus-subtask");
    const state = card.querySelector(".focus-sub-state");
    const next = card.querySelector(".focus-next");
    const primary = card.querySelector(".focus-btn-primary");
    const ghost = card.querySelector(".focus-btn-ghost");
    const pick = (el) => {
      if (!el) return null;
      const c = getComputedStyle(el);
      return { bg: c.backgroundColor, color: c.color, fs: c.fontSize, radius: c.borderRadius, pad: c.padding };
    };
    return {
      width: Math.round(rect.width),
      radius: cs.borderRadius,
      padding: cs.padding,
      gap: cs.gap,
      fontFamily: cs.fontFamily.split(",")[0],
      badge: pick(badge),
      title: pick(card.querySelector(".focus-title")),
      desc: pick(card.querySelector(".focus-desc")),
      meta: pick(meta),
      divider: getComputedStyle(card.querySelector(".focus-divider")).borderTopWidth + " " + getComputedStyle(card.querySelector(".focus-divider")).borderTopColor,
      bar: getComputedStyle(card.querySelector(".focus-sub-bar")).backgroundColor,
      state: pick(state),
      nextColor: getComputedStyle(next).color,
      primary: pick(primary),
      ghost: pick(ghost),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="focus-card"]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8, width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 };
  });
  await page.screenshot({ path: "_verify/hero-focus-new.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
