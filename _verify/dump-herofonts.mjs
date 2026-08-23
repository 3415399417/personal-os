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
    const gs = (el) => { const s = getComputedStyle(el); return { fs: s.fontSize, c: s.color }; };
    const q = (s) => document.querySelector(s);
    return {
      eyebrow: gs(q(".card-eyebrow")),
      tag: gs(q(".tag")),
      title: gs(q(".focus-title")),
      desc: gs(q(".focus-desc")),
      meta: gs(q(".focus-meta")),
      listSpan: gs(q(".focus-list span")),
      listB: gs(q(".focus-list b")),
      state: gs(q(".focus-list .state")),
      btn: gs(q(".focus-btns .btn")),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  const hero = await page.$('[data-od-id="hero"]');
  await hero.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\hero-fonts.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
