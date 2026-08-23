// 验证：通用化后的 note 标签样式在亮/暗色下都生效
import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluateOnNewDocument((t) => localStorage.setItem("theme", t), theme);
    await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 3000));
    const s = await page.evaluate(() => {
      const tag = document.querySelector('[data-od-id="card-notes"] .note-type-tag');
      if (!tag) return { found: false };
      const cs = getComputedStyle(tag);
      return { found: true, color: cs.color, bg: cs.backgroundColor, fontSize: cs.fontSize };
    });
    console.log(`[${theme}]`, JSON.stringify(s));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
