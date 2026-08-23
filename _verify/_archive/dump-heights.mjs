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

  const info = await page.evaluate(() => {
    const sel = (s) => document.querySelector(s);
    const desc = (el, name) => {
      if (!el) return { name, missing: true };
      const r = el.getBoundingClientRect();
      return {
        name,
        top: Math.round(r.top),
        h: Math.round(r.height),
        clientH: el.clientHeight,
        scrollH: el.scrollHeight,
        overflowY: getComputedStyle(el).overflowY,
        display: getComputedStyle(el).display,
      };
    };
    return {
      body: desc(document.body, "body"),
      html: desc(document.documentElement, "html"),
      app: desc(sel('[data-od-id="app"]') || sel("main") || sel("#__next > div"), "__next div"),
      page: desc(sel(".page"), ".page"),
      pageScroll: desc(sel(".page-scroll"), ".page-scroll"),
      hero: desc(sel("[data-od-id='hero']") || sel(".hero"), "hero"),
      row1: desc(sel('[data-od-id="row-today"]'), "row1"),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
