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
  await new Promise((r) => setTimeout(r, 4000));

  // 滚动到第三行卡片，确保在视口内
  await page.evaluate(() => {
    document.querySelector('[data-od-id="card-quick"]').scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 800));

  // 逐行截图：把两张卡片截到同一张图（它们在同一行）
  const shot = await page.evaluate(() => {
    const q = document.querySelector('[data-od-id="card-quick"]').getBoundingClientRect();
    const a = document.querySelector('[data-od-id="card-assets"]').getBoundingClientRect();
    return {
      qx: q.x, qy: q.y, qr: q.right, qb: q.bottom,
      ax: a.x, ay: a.y, ar: a.right, ab: a.bottom,
    };
  });
  const clip = {
    x: Math.round(Math.min(shot.qx, shot.ax)) - 6,
    y: Math.round(Math.min(shot.qy, shot.ay)) - 6,
    width: Math.round(Math.max(shot.qr, shot.ar) - Math.min(shot.qx, shot.ax)) + 12,
    height: Math.round(Math.max(shot.qb, shot.ab) - Math.min(shot.qy, shot.ay)) + 12,
  };
  console.log("CLIP:", JSON.stringify(clip));
  await page.screenshot({ path: "_verify/row-tools-crop.png", clip });

  // 图标元素特写（快速入口第1个 + 资产库第1个）
  const qIco = await page.$('[data-od-id="card-quick"] .quick-cell-ico');
  await qIco.screenshot({ path: "_verify/quick-ico-zoom.png" });
  const aIco = await page.$('[data-od-id="card-assets"] .asset-cell-ico');
  await aIco.screenshot({ path: "_verify/assets-ico-zoom.png" });

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
