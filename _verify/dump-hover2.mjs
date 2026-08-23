import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  const box = await page.evaluate(() => {
    const item = document.querySelector('[data-od-id="card-notes"] .note-item');
    const r = item.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  // 真实移动鼠标到笔记条目上
  await page.mouse.move(box.x, box.y);
  await new Promise((r) => setTimeout(r, 400));
  const hoverBg = await page.evaluate(() => {
    const item = document.querySelector('[data-od-id="card-notes"] .note-item');
    return getComputedStyle(item).backgroundColor;
  });
  // 移开
  await page.mouse.move(10, 10);
  await new Promise((r) => setTimeout(r, 300));
  const outBg = await page.evaluate(() => {
    const item = document.querySelector('[data-od-id="card-notes"] .note-item');
    return getComputedStyle(item).backgroundColor;
  });

  console.log(JSON.stringify({ hoverBg, outBg, box }));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
