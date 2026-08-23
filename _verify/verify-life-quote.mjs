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
  await new Promise((r) => setTimeout(r, 3500));

  // 滚动到生活卡片
  await page.evaluate(() => {
    document.querySelector('[data-od-id="card-life"]').scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 800));

  // 测试一句话：点击空态 → 输入 → 保存
  const before = await page.evaluate(() => {
    const q = document.querySelector('[data-od-id="card-life"] .life-quote');
    return q ? q.textContent.trim() : null;
  });
  console.log("QUOTE_BEFORE:", JSON.stringify(before));

  await page.evaluate(() => {
    document.querySelector('[data-od-id="card-life"] .life-quote')?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.type('[data-od-id="card-life"] .life-quote-input', "今天完成了不少功能，有点累但充实");
  await page.evaluate(() => {
    document.querySelector('[data-od-id="card-life"] .life-quote-save')?.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const after = await page.evaluate(() => {
    const q = document.querySelector('[data-od-id="card-life"] .life-quote');
    return q ? q.textContent.trim() : null;
  });
  console.log("QUOTE_AFTER:", JSON.stringify(after));
  await page.screenshot({ path: "_verify/life-quote.png", clip: await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="card-life"]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 6, y: Math.round(r.y) - 6, width: Math.round(r.width) + 12, height: Math.round(r.height) + 12 };
  }) });

  // 设置页数据管理
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  const settings = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".setting-row")].map((r) => r.textContent.replace(/\s+/g, " ").trim());
    return rows.filter((t) => t.includes("导出") || t.includes("备份"));
  });
  console.log("SETTINGS_DATA:", JSON.stringify(settings));

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
