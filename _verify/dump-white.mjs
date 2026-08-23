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
    const gs = (el) => getComputedStyle(el).backgroundColor;
    return {
      card: gs(document.querySelector(".card")),
      execCard: gs(document.querySelector('[data-od-id="card-exec"]')),
      greet: gs(document.querySelector(".greet-card")),
      sideStats: gs(document.querySelector(".side-stats")),
      sideTodos: gs(document.querySelector(".side-todos")),
      sideReminders: gs(document.querySelector(".side-reminders")),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\white-bg.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
