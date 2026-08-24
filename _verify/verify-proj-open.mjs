import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1200"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 200)));

  // 项目列表 → 点击第一个项目卡片 → 详情页
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const cards = await page.$$(".mini-card");
  console.log("项目卡片数:", cards.length);
  if (cards.length === 0) {
    console.log("没有项目卡片（列表为空？）");
    await browser.close();
    return;
  }
  await cards[0].click();
  await new Promise((r) => setTimeout(r, 2500));

  const state = await page.evaluate(() => {
    const body = document.body.textContent.replace(/\s+/g, " ").trim();
    return {
      hasError: body.includes("Application error") || body.includes("client-side exception"),
      head: document.querySelector(".page-title, h1, .panel-title")?.textContent?.trim() ?? "",
      snippet: body.slice(0, 150),
    };
  });
  console.log("详情页状态:", JSON.stringify(state));
  console.log("console errors:", JSON.stringify(errors));

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
