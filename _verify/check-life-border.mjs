import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  const out = await page.evaluate(() => {
    const li = document.querySelector('[data-od-id="card-life"] .life-item');
    const cs = getComputedStyle(li);
    return {
      borderTop: cs.borderTopWidth + " " + cs.borderTopStyle,
      borderRight: cs.borderRightWidth + " " + cs.borderRightStyle,
      borderLeft: cs.borderLeftWidth + " " + cs.borderLeftStyle,
      borderBottom: cs.borderBottomWidth + " " + cs.borderBottomStyle,
      background: cs.backgroundColor,
      borderRadius: cs.borderRadius,
    };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
