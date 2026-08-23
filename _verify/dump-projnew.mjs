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
    const c = document.querySelector('[data-od-id="card-projects"]');
    const img = c.querySelector(".projects-art");
    const ir = img.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    return {
      src: img.getAttribute("src"),
      loaded: img.complete && img.naturalWidth > 0,
      natural: { w: img.naturalWidth, h: img.naturalHeight },
      display: { w: Math.round(ir.width), h: Math.round(ir.height) },
      bottomGap: Math.round(cr.bottom - ir.bottom),
      opacity: getComputedStyle(img).opacity,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  const el = await page.$('[data-od-id="card-projects"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\proj-new.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
