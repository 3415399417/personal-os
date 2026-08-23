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
    const map = {
      "card-exec": ".exec-art",
      "card-life": ".life-art",
      "card-study": ".study-art",
      "card-notes": ".notes-art",
      "card-resources": ".resources-art",
      "card-projects": ".projects-art",
    };
    const out = {};
    for (const [cardId, sel] of Object.entries(map)) {
      const c = document.querySelector(`[data-od-id="${cardId}"]`);
      const img = c ? c.querySelector(sel) : null;
      if (!img) {
        out[cardId] = { found: false };
        continue;
      }
      const r = img.getBoundingClientRect();
      out[cardId] = {
        found: true,
        src: img.getAttribute("src"),
        loaded: img.complete && img.naturalWidth > 0,
        w: Math.round(r.width),
        h: Math.round(r.height),
        opacity: getComputedStyle(img).opacity,
      };
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\all-art.png", fullPage: true });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
