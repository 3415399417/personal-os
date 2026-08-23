import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });
  await page.goto("http://localhost:3000/stats", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    return {
      navStats: [...document.querySelectorAll(".topnav a")].some((a) => a.textContent.includes("统计")),
      bars: [...document.querySelectorAll(".stats-bar-col")].map((c) => ({
        label: c.querySelector(".stats-bar-label")?.textContent,
        num: c.querySelector(".stats-bar-num")?.textContent,
      })),
      ov: [...document.querySelectorAll(".stats-ov-card")].map((c) => c.textContent.replace(/\s+/g, " ").trim()),
      projects: [...document.querySelectorAll(".stats-proj-head b")].map((b) => b.textContent),
      timeline: [...document.querySelectorAll(".stats-tl-text")].length,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "_verify/stats-page.png", fullPage: true });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
