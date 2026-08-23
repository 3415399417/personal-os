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
  await new Promise((r) => setTimeout(r, 2500));
  // 开暗色
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "_verify/dark-home-fixed.png" });
  // 关掉
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
