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

  // 滚动到第三行
  await page.evaluate(() => {
    const sc = document.querySelector(".page-scroll");
    sc.scrollTop = sc.scrollHeight;
  });
  await new Promise((r) => setTimeout(r, 800));

  const quick = await page.$('[data-od-id="card-quick"]');
  await quick.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-quick.png" });
  const assets = await page.$('[data-od-id="card-assets"]');
  await assets.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-assets.png" });

  const info = await page.evaluate(() => {
    const q = document.querySelector('[data-od-id="card-quick"]');
    const a = document.querySelector('[data-od-id="card-assets"]');
    return {
      quickTitle: q.querySelector(".card-title").textContent,
      quickCells: [...q.querySelectorAll(".quick-cell")].map((c) => ({
        label: c.querySelector(".quick-cell-label")?.textContent,
        icoColor: getComputedStyle(c.querySelector(".quick-cell-ico")).color,
        icoBg: getComputedStyle(c.querySelector(".quick-cell-ico")).backgroundColor,
      })),
      assetCells: [...a.querySelectorAll(".asset-cell")].map((c) => ({
        text: c.textContent.replace(/\s+/g, " ").trim(),
        icoBg: getComputedStyle(c.querySelector(".asset-cell-ico")).backgroundColor,
      })),
      assetFoot: a.querySelector(".card-foot")?.textContent.trim(),
      hasCount: /^[0-9]+$/.test(a.textContent.replace(/[^0-9]/g, "").slice(0, 2)),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
