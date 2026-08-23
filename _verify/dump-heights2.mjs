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
    const h = (el) => Math.round(el.getBoundingClientRect().height);
    const hero = document.querySelector('[data-od-id="hero"]');
    const heroChildren = [...hero.querySelectorAll(":scope > div")].map((d) => ({
      cls: d.className,
      h: h(d),
    }));
    const rows = [...document.querySelectorAll(".grid-row")].map((row) => {
      const cards = [...row.querySelectorAll(".card")].map((c) => ({
        od: c.getAttribute("data-od-id"),
        h: h(c),
      }));
      return { h: h(row), cards };
    });
    const sc = document.querySelector(".page-scroll");
    return {
      viewport: window.innerHeight,
      pageScrollH: h(sc),
      scrollH: sc.scrollHeight,
      heroH: h(hero),
      heroChildren,
      rows,
      totalContent: h(document.querySelector(".page")),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
