import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));
  const exec = await page.$('[data-od-id="card-exec"]');
  await exec.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-kaiti-zoom.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
