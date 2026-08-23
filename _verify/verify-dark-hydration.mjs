// 验证：暗色模式下无 hydration mismatch 警告
import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("theme", "dark");
  });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      errors.push(`[${msg.type()}] ${msg.text().slice(0, 300)}`);
    }
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${String(err.message).slice(0, 300)}`));

  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  // 导航到另一页再检查
  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find((a) => a.getAttribute("href") === "/projects");
    if (link) link.click();
  });
  await new Promise((r) => setTimeout(r, 2500));

  const theme = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme ?? null,
    bg: getComputedStyle(document.body).backgroundColor,
  }));

  const mismatch = errors.filter((e) => /hydrat|did not match|server rendered/i.test(e));
  console.log("theme:", JSON.stringify(theme));
  console.log("全部 console 消息:", errors.length ? errors : "无");
  console.log("hydration 相关:", mismatch.length ? mismatch : "无 ✅");

  // 404 资源类忽略（sw.js/favicon），只判 hydration
  const ok = mismatch.length === 0;
  console.log(ok ? "✅ 无 hydration 警告，暗色正常" : "❌ 仍有 hydration 警告");
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
