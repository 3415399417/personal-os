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

  const cards = ["card-projects", "card-resources", "card-study", "card-notes", "card-life"];
  for (const id of cards) {
    const el = await page.$(`[data-od-id="${id}"]`);
    if (el) {
      await el.screenshot({ path: `C:\\Users\\34153\\.openclaw\\workspace\\card-${id}.png` });
    }
  }
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
