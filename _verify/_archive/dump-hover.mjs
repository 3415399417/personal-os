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

  const info = await page.evaluate(async () => {
    const item = document.querySelector('[data-od-id="card-notes"] .note-item');
    if (!item) return { found: false };
    // 悬停前背景
    const before = getComputedStyle(item).backgroundColor;
    // 模拟 hover
    item.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    const after = getComputedStyle(item).backgroundColor;
    item.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    return { found: true, before, after };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
