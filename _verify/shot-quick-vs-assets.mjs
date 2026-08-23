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
  await new Promise((r) => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const quick = document.querySelector('[data-od-id="card-quick"]');
    const assets = document.querySelector('[data-od-id="card-assets"]');
    const measure = (card, sel) => {
      const el = card.querySelector(sel);
      const cs = getComputedStyle(el);
      const svg = el.querySelector("svg");
      const scs = getComputedStyle(svg);
      return {
        box: cs.width + "x" + cs.height,
        radius: cs.borderRadius,
        svg: scs.width + "x" + scs.height,
        bg: cs.backgroundColor,
      };
    };
    return {
      quick: measure(quick, ".quick-cell-ico"),
      assets: measure(assets, ".asset-cell-ico"),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const rq = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="card-quick"]');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  const ra = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="card-assets"]');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.screenshot({ path: "_verify/quick-card-crop.png", clip: { x: rq.x - 4, y: rq.y - 4, width: rq.w + 8, height: rq.h + 8 } });
  await page.screenshot({ path: "_verify/assets-card-crop.png", clip: { x: ra.x - 4, y: ra.y - 4, width: ra.w + 8, height: ra.h + 8 } });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
