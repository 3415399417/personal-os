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

  // 打开新建复盘 modal 检查本周完成区
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("新建复盘"))?.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const info = await page.evaluate(() => {
    const label = [...document.querySelectorAll(".field-label")].find((l) => l.textContent.includes("本周完成"));
    const chips = label ? [...label.parentElement.querySelectorAll(".review-recent-chip")].map((c) => c.textContent.trim()) : [];
    // 点击第一个 chip 验证加入亮点
    if (chips.length > 0) label.parentElement.querySelector(".review-recent-chip").click();
    const wins = document.querySelector("#rv-wins")?.value;
    return { hasAiPanel: !!document.querySelector(".panel-title")?.textContent.includes("AI"), recentCount: chips.length, firstChip: chips[0], winsAfterClick: wins };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "_verify/review-closed-loop.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
