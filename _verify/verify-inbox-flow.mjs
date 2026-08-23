import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/inbox", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));

  // 加一条测试条目
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("收集一条"))?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.type(".input", "下周要给客户演示外贸AI系统，记得准备演示环境和话术");
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 1200));

  // 点 AI 归类
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("AI 归类"))?.click();
  });
  await new Promise((r) => setTimeout(r, 8000));

  const info = await page.evaluate(() => {
    const tag = document.querySelector(".inbox-suggest-tag")?.textContent ?? null;
    const btns = [...document.querySelectorAll(".inbox-suggest button")].map((b) => b.textContent.trim());
    return { tag, btns };
  });
  console.log("SUGGEST:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "_verify/inbox-suggest.png" });

  // 采纳建议
  await page.evaluate(() => {
    [...document.querySelectorAll(".inbox-suggest button")].find((b) => b.textContent.includes("采纳"))?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  const after = await page.evaluate(() => {
    const item = document.querySelector(".list-item");
    return item ? { handledBadge: !!item.querySelector(".badge.done"), text: item.querySelector(".list-item-title")?.textContent } : null;
  });
  console.log("AFTER_ADOPT:", JSON.stringify(after));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
