import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  // 暗色模式：设置页开开关 → 首页验证
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => {
    [...document.querySelectorAll(".setting-row")].find((row) => row.textContent.includes("暗色模式"))?.querySelector(".switch")?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  console.log("THEME_AFTER_TOGGLE:", theme);
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  const darkApplied = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return { theme: document.documentElement.dataset.theme, bg: body.backgroundColor, color: body.color };
  });
  console.log("DARK_HOME:", JSON.stringify(darkApplied));
  await page.screenshot({ path: "_verify/dark-home.png" });
  // 恢复浅色
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await page.evaluate(() => {
    const sw = [...document.querySelectorAll(".setting-row")].find((row) => row.textContent.includes("暗色模式"))?.querySelector(".switch");
    if (sw?.className.includes("on")) sw.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // 项目完成仪式：项目详情页应有「标记完成」按钮
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  const projLink = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a[href*='/projects/']")];
    return links[0]?.getAttribute("href") ?? null;
  });
  console.log("PROJ_LINK:", projLink);
  if (projLink) {
    await page.goto("http://localhost:3000" + projLink, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));
    const btn = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("标记完成"));
      return b ? b.textContent.trim() : null;
    });
    console.log("COMPLETE_BTN:", btn);
  }
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
