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
  await new Promise((r) => setTimeout(r, 3000));

  // 首屏（顶部）
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-top.png" });

  // 滚动到中间（看第二行卡片）
  await page.evaluate(() => {
    const sc = document.querySelector(".page-scroll");
    sc.scrollTop = 400;
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-mid.png" });

  // 滚动到底部（第三行）
  await page.evaluate(() => {
    const sc = document.querySelector(".page-scroll");
    sc.scrollTop = sc.scrollHeight;
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-bottom.png" });

  const info = await page.evaluate(() => {
    const sc = document.querySelector(".page-scroll");
    const cards = ["card-quick", "card-ai", "card-assets"].map((id) => {
      const el = document.querySelector(`[data-od-id="${id}"]`);
      const r = el.getBoundingClientRect();
      return { id, h: Math.round(r.height), y: Math.round(r.y), vis: r.bottom <= window.innerHeight && r.top >= 0 };
    });
    return { scrolled: sc.scrollTop, maxScroll: sc.scrollHeight - sc.clientHeight, cards };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
