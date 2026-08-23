// 验证暗色模式 FOUC 修复：整页加载时 documentElement 立即带 data-theme
import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  // 预置 localStorage theme=dark（模拟用户已开启暗色）
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("theme", "dark");
  });

  const checks = {};
  // 首帧检查：在 DOMContentLoaded 之前抓 documentElement 的 data-theme
  await page.evaluateOnNewDocument(() => {
    window.__firstThemeCheck = (() => {
      try {
        return {
          atStart: document.documentElement.dataset.theme ?? null,
          bodyBg: getComputedStyle(document.body).backgroundColor,
        };
      } catch {
        return null;
      }
    })();
  });

  // 导航到首页（整页加载）
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
  checks.domContentLoaded = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? null,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  await new Promise((r) => setTimeout(r, 1500));
  checks.afterLoad = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? null,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    htmlAttr: document.documentElement.getAttribute("data-theme"),
  }));

  // 再整页跳转一次（模拟点击 <a> 后的整页导航）
  await page.goto("http://127.0.0.1:3000/projects", { waitUntil: "domcontentloaded", timeout: 60000 });
  checks.projectsPage = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? null,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));

  console.log(JSON.stringify(checks, null, 2));
  const ok =
    checks.domContentLoaded.theme === "dark" &&
    checks.afterLoad.theme === "dark" &&
    checks.projectsPage.theme === "dark" &&
    checks.afterLoad.bodyBg !== "rgb(255, 255, 255)";
  console.log(ok ? "✅ 暗色模式首帧即生效，无闪白" : "❌ 仍有闪白风险");
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
