import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 200)));
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message.slice(0, 200)));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/review", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("生成日报"))?.click();
  });
  await new Promise((r) => setTimeout(r, 10000));

  const state = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("AI 日报"));
    if (!panel) return null;
    return {
      hasReport: !!panel.querySelector(".report-text"),
      hasLoading: panel.textContent.includes("正在汇总"),
      hasError: panel.textContent.includes("⚠️"),
      text: panel.textContent.slice(0, 120).replace(/\s+/g, " "),
      reportLen: panel.querySelector(".report-text")?.textContent.length ?? 0,
    };
  });
  console.log("STATE:", JSON.stringify(state));
  console.log("LOGS:", JSON.stringify(logs.slice(0, 8), null, 1));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
