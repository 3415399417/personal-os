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
    const c = document.querySelector('[data-od-id="card-resources"]');
    const cr = c.getBoundingClientRect();
    const cells = [...c.querySelectorAll(".res-row-cell")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        t: el.textContent.trim().slice(0, 4),
        y: Math.round(r.top - cr.top),
        x: Math.round(r.left - cr.left),
      };
    });
    return cells;
  });
  console.log(JSON.stringify(info, null, 2));
  const el = await page.$('[data-od-id="card-resources"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-res2.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
