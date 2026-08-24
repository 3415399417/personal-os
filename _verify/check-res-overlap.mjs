import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1200"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));
  const el = await page.$('[data-od-id="res-r7"]');
  if (el) {
    const box = await el.boundingBox();
    console.log("r7 box:", JSON.stringify(box));
    await page.screenshot({
      path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-res-r7.png",
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    // 检查文字/数字是否被插画盖住（比较元素实际渲染位置）
    const info = await page.evaluate(() => {
      const cell = document.querySelector('[data-od-id="res-r7"]');
      const art = document.querySelector(".resources-art");
      if (!cell || !art) return { cell: !!cell, art: !!art };
      const cr = cell.getBoundingClientRect();
      const ar = art.getBoundingClientRect();
      const overlap = !(ar.right < cr.left || ar.left > cr.right || ar.bottom < cr.top || ar.top > cr.bottom);
      return {
        cell: { x: cr.x, y: cr.y, w: cr.width, h: cr.height },
        art: { x: ar.x, y: ar.y, w: ar.width, h: ar.height },
        overlap,
        artZ: getComputedStyle(art).zIndex,
        artOpacity: getComputedStyle(art).opacity,
      };
    });
    console.log("overlap info:", JSON.stringify(info, null, 2));
  }
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
