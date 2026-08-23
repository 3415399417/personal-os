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

  // 输入搜索词
  await page.type("#globalSearch", "CRUD");
  await new Promise((r) => setTimeout(r, 1500));

  const info = await page.evaluate(() => {
    const panel = document.querySelector('[data-od-id="search-results"]');
    if (!panel) return { noPanel: true };
    const groups = [...panel.querySelectorAll(".search-group")].map((g) => ({
      label: g.querySelector(".search-group-label")?.textContent,
      items: [...g.querySelectorAll(".search-result-title")].map((t) => t.textContent),
    }));
    return { groups, total: [...panel.querySelectorAll(".search-result-item")].length };
  });
  console.log("RESULTS:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "_verify/search-results.png" });

  // 点击第一个项目结果 → 应跳转 /projects/xxx
  await page.evaluate(() => {
    const groups = document.querySelectorAll('[data-od-id="search-results"] .search-group');
    for (const g of groups) {
      const label = g.querySelector(".search-group-label")?.textContent;
      if (label === "项目") {
        g.querySelector(".search-result-item")?.click();
        return;
      }
    }
    document.querySelector('[data-od-id="search-results"] .search-result-item')?.click();
  });
  await new Promise((r) => setTimeout(r, 2500));
  console.log("URL_AFTER_CLICK:", page.url());

  // Esc 关闭测试：重新打开输入，按 Esc
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.type("#globalSearch", "AI");
  await new Promise((r) => setTimeout(r, 1200));
  const open1 = await page.evaluate(() => !!document.querySelector('[data-od-id="search-results"]'));
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 300));
  const open2 = await page.evaluate(() => !!document.querySelector('[data-od-id="search-results"]'));
  console.log("ESC_CLOSE:", open1, "->", open2);

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
