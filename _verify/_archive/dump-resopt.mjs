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

  const v = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-resources"]');
    const cr = c.getBoundingClientRect();
    const head = c.querySelector(".card-head").getBoundingClientRect();
    const grid = c.querySelector(".res-grid2").getBoundingClientRect();
    const foot = c.querySelector(".card-foot").getBoundingClientRect();
    return {
      cardH: Math.round(cr.height),
      topGap: Math.round(grid.top - head.bottom),
      bottomGap: Math.round(foot.top - grid.bottom),
      gridH: Math.round(grid.height),
    };
  });
  console.log(JSON.stringify(v));
  const el = await page.$('[data-od-id="card-resources"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\res-opt.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
