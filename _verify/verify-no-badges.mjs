import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1000"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    if (!card) return { card: false };
    return {
      card: true,
      pills: card.querySelectorAll(".sense-pill, .proj-sense").length,
      rows: Array.from(card.querySelectorAll("li")).map((li) => li.textContent.replace(/\s+/g, " ").trim()),
    };
  });
  console.log(JSON.stringify(result, null, 2));

  const el = await page.$('[data-od-id="card-projects"]');
  if (el) await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-no-badges.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
