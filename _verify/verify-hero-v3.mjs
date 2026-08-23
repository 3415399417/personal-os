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
    const hero = document.querySelector('[data-od-id="hero"]');
    const cr = card.getBoundingClientRect();
    const hr = hero.getBoundingClientRect();
    return {
      cardW: Math.round(cr.width),
      heroW: Math.round(hr.width),
      ratio: Math.round((cr.width / hr.width) * 100) + "%",
      cardH: Math.round(cr.height),
      heroH: Math.round(hr.height),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="focus-card"]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8, width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 };
  });
  await page.screenshot({ path: "_verify/hero-focus-v3.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
