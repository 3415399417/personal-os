import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  // 全新浏览器上下文（无 localStorage 标记）→ 应触发自动日报
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 12000)); // 等 AI 生成

  const toast = await page.evaluate(() => document.querySelector(".global-toast")?.textContent ?? null);
  console.log("TOAST:", JSON.stringify(toast));

  // 验证复盘已生成
  const res = await fetch("http://localhost:3000/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getReviews" }),
  });
  const reviews = await res.json();
  const ai = (reviews ?? []).filter((r) => (r.title || "").startsWith("AI"));
  console.log("AI_REVIEWS:", JSON.stringify(ai.map((r) => ({ title: r.title, summaryLen: r.summary?.length }))));

  // 清理测试产生的自动日报（保留功能验证，但清掉避免重复——下次打开不会再生成因为 localStorage 标记在）
  // 不删：这是真实功能产物，哥哥能看到
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
