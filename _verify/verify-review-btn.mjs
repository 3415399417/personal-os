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
  await new Promise((r) => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".page-actions a, .page-actions button")].map((b) => ({
      text: b.textContent.trim(),
      href: b.getAttribute("href"),
    }));
    return btns;
  });
  console.log("REVIEW_ACTIONS:", JSON.stringify(info));
  await page.screenshot({ path: "_verify/review-page.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
