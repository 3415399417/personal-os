import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto("http://localhost:3000/github", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  await page.evaluate(() => {
    [...document.querySelectorAll(".github-subtab")].find((b) => b.textContent === "Harness")?.click();
  });
  await new Promise((r) => setTimeout(r, 4500));

  const info = await page.evaluate(() => {
    const titles = [...document.querySelectorAll(".github-section-title")].map((t) => t.textContent.trim());
    const notices = [...document.querySelectorAll(".news-item .notice-tag")].map((t) => t.textContent);
    const noticeNames = [...document.querySelectorAll(".news-item .news-title")].map((t) => t.textContent);
    const plugins = [...document.querySelectorAll(".github-card .github-name")].map((n) => n.textContent);
    return { titles, notices, noticeNames, pluginCount: plugins.length, plugins: plugins.slice(0, 6) };
  });
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: "_verify/github-harness-v2.png", fullPage: true });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
