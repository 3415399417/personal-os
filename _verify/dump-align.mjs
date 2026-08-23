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
    const c = document.querySelector('[data-od-id="card-exec"]');
    const cr = c.getBoundingClientRect();
    const lefts = [...c.querySelectorAll(".exec-cats li")].map((li) => {
      const r = li.getBoundingClientRect();
      return { t: li.textContent.trim(), y: Math.round(r.top - cr.top), h: Math.round(r.height) };
    });
    const rights = [...c.querySelectorAll(".exec-status-list li")].map((li) => {
      const r = li.getBoundingClientRect();
      return { t: li.textContent.trim(), y: Math.round(r.top - cr.top), h: Math.round(r.height), x: Math.round(r.left - cr.left), w: Math.round(r.width) };
    });
    const img = c.querySelector(".exec-art");
    const ir = img.getBoundingClientRect();
    const body = c.querySelector(".exec-body").getBoundingClientRect();
    return {
      cardH: Math.round(cr.height),
      execBody: { y: Math.round(body.top - cr.top), h: Math.round(body.height) },
      lefts,
      rights,
      img: { x: Math.round(ir.left - cr.left), y: Math.round(ir.top - cr.top), w: Math.round(ir.width), h: Math.round(ir.height) },
    };
  });
  console.log(JSON.stringify(info, null, 2));
  const el = await page.$('[data-od-id="card-exec"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\exec-align.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
