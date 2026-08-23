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
    const app = document.querySelector(".app").getBoundingClientRect();
    const sidebar = document.querySelector(".sidebar").getBoundingClientRect();
    const main = document.querySelector(".main").getBoundingClientRect();
    const content = document.querySelector(".content").getBoundingClientRect();
    const page = document.querySelector(".page").getBoundingClientRect();
    const row1 = document.querySelector('[data-od-id="row-today"]').getBoundingClientRect();
    const row1Cols = getComputedStyle(document.querySelector('[data-od-id="row-today"]')).gridTemplateColumns;
    const rowGap = getComputedStyle(document.querySelector('[data-od-id="row-today"]')).gap;
    const cs = getComputedStyle(document.querySelector(".content"));
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      app: { w: Math.round(app.width) },
      sidebar: { w: Math.round(sidebar.width) },
      main: { w: Math.round(main.width) },
      content: { w: Math.round(content.width), padding: cs.padding },
      page: { w: Math.round(page.width) },
      row1: { w: Math.round(row1.width) },
      row1Cols,
      rowGap,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
