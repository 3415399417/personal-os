import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));

  // 先滚动到卡片位置，确保完整可见
  await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="card-life"]');
    el.scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 800));

  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="card-life"]');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log("RECT:", JSON.stringify(rect));

  // 截取生活卡片区域（放大 2 倍，提高清晰度）
  await page.screenshot({
    path: "_verify/life-card-crop.png",
    clip: { x: rect.x - 4, y: rect.y - 4, width: rect.w + 8, height: rect.h + 8 },
  });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
