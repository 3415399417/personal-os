import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  // 滚动到底部
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\bottom.png" });

  const info = await page.evaluate(() => {
    const q = document.querySelector('[data-od-id="card-quick"]');
    const ai = document.querySelector('[data-od-id="card-ai"]');
    const as = document.querySelector('[data-od-id="card-assets"]');
    const get = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const items = el.querySelectorAll(".quick-item, .mini-card, .asset-row, li").length;
      return { y: Math.round(r.y), h: Math.round(r.height), items, text: el.textContent.slice(0, 60).replace(/\s+/g, " ") };
    };
    return {
      scrollY: window.scrollY,
      maxScroll: document.body.scrollHeight - window.innerHeight,
      bodyH: document.body.scrollHeight,
      quick: get(q),
      ai: get(ai),
      assets: get(as),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
