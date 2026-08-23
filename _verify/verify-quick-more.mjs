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

  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-quick"]');
    const foot = card.querySelector(".card-foot");
    const link = card.querySelector('[data-od-id="quick-more"]');
    const cs = getComputedStyle(link);
    const footCs = getComputedStyle(foot);
    return {
      text: link.textContent.trim(),
      href: link.getAttribute("href"),
      textDecoration: cs.textDecoration,
      footBorderTop: footCs.borderTopWidth + " " + footCs.borderTopStyle,
      hasDivider: !!card.querySelector(".exec-divider"),
    };
  });
  console.log("INFO:", JSON.stringify(info));

  // hover 后检查下划线
  await page.hover('[data-od-id="quick-more"]');
  await new Promise((r) => setTimeout(r, 400));
  const hoverDeco = await page.evaluate(() => {
    const link = document.querySelector('[data-od-id="quick-more"]');
    return getComputedStyle(link).textDecoration;
  });
  console.log("HOVER_DECO:", hoverDeco);

  // 点击跳转验证
  await page.click('[data-od-id="quick-more"]');
  await new Promise((r) => setTimeout(r, 2500));
  console.log("URL_AFTER_CLICK:", page.url());

  // 滚动回工作台卡片截图
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => {
    document.querySelector('[data-od-id="card-quick"]').scrollIntoView({ block: "center" });
  });
  await new Promise((r) => setTimeout(r, 800));
  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="card-quick"]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 4, y: Math.round(r.y) - 4, width: Math.round(r.width) + 8, height: Math.round(r.height) + 8 };
  });
  await page.screenshot({ path: "_verify/quick-card-foot.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
