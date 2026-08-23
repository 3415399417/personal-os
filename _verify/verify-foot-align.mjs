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
  await new Promise((r) => setTimeout(r, 3000));

  await page.evaluate(() => {
    document.querySelector('[data-od-id="card-quick"]').scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 800));

  const info = await page.evaluate(() => {
    const quick = document.querySelector('[data-od-id="card-quick"]');
    const assets = document.querySelector('[data-od-id="card-assets"]');
    const qLink = document.querySelector('[data-od-id="quick-more"]');
    const aLink = document.querySelector('[data-od-id="assets-more"]');
    const qCard = quick.getBoundingClientRect();
    const aCard = assets.getBoundingClientRect();
    const ql = qLink.getBoundingClientRect();
    const al = aLink.getBoundingClientRect();
    return {
      // 链接顶部相对各自卡片底部的距离（越小越贴底）
      quickLinkToBottom: Math.round((qCard.bottom - ql.bottom) * 10) / 10,
      assetsLinkToBottom: Math.round((aCard.bottom - al.bottom) * 10) / 10,
      // 链接顶部相对各自卡片顶部的距离
      quickLinkFromTop: Math.round((ql.top - qCard.top) * 10) / 10,
      assetsLinkFromTop: Math.round((al.top - aCard.top) * 10) / 10,
      cardHeights: [Math.round(qCard.height), Math.round(aCard.height)],
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // 并排截图确认
  const shot = await page.evaluate(() => {
    const q = document.querySelector('[data-od-id="card-quick"]').getBoundingClientRect();
    const a = document.querySelector('[data-od-id="card-assets"]').getBoundingClientRect();
    return {
      x: Math.round(Math.min(q.x, a.x)) - 6,
      y: Math.round(Math.min(q.y, a.y)) - 6,
      width: Math.round(Math.max(q.right, a.right) - Math.min(q.x, a.x)) + 12,
      height: Math.round(Math.max(q.bottom, a.bottom) - Math.min(q.y, a.y)) + 12,
    };
  });
  await page.screenshot({ path: "_verify/row-tools-aligned.png", clip: shot });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
