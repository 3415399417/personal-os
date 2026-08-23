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
  await new Promise((r) => setTimeout(r, 3500));
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-exec"]');
    const row = c.querySelector(".card-title-row");
    const img = row.querySelector(".card-title-ico");
    const title = row.querySelector(".card-title");
    const ir = img.getBoundingClientRect();
    const tr = title.getBoundingClientRect();
    return {
      hasRow: !!row,
      hasText: !!title,
      text: title?.textContent,
      imgLoaded: img.complete && img.naturalWidth > 0,
      imgW: Math.round(ir.width),
      gap: Math.round(tr.left - ir.right),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  const el = await page.$('[data-od-id="card-exec"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\exec-title.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
