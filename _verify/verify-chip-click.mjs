import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/review", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("新建复盘"))?.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.evaluate(() => {
    const label = [...document.querySelectorAll(".field-label")].find((l) => l.textContent.includes("本周完成"));
    label.parentElement.querySelector(".review-recent-chip").click();
  });
  await new Promise((r) => setTimeout(r, 600));
  const wins = await page.evaluate(() => document.querySelector("#rv-wins")?.value);
  console.log("WINS_AFTER_CLICK:", JSON.stringify(wins));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
