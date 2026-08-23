import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const fails = [];
  page.on("requestfailed", (req) => fails.push(req.url()));
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-exec"]');
    const img = c.querySelector(".exec-art");
    if (!img) return { hasImg: false };
    const r = img.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    return {
      hasImg: true,
      src: img.getAttribute("src"),
      w: Math.round(r.width),
      h: Math.round(r.height),
      x: Math.round(r.left - cr.left),
      y: Math.round(r.top - cr.top),
      z: getComputedStyle(img).zIndex,
      natural: { w: img.naturalWidth, h: img.naturalHeight },
      loaded: img.complete && img.naturalWidth > 0,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  console.log("FAILS:", fails.join(",") || "none");
  const el = await page.$('[data-od-id="card-exec"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-exec-art.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
