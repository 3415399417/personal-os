import puppeteer from "puppeteer-core";

(async () => {
  // 真实调用 /api/chat（走 DeepSeek），问项目进展
  const resp = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "现在项目进展怎么样？有没有需要我处理的？" }],
      model: "flash",
      pathname: "/ai",
    }),
    cache: "no-store",
  });
  const d = await resp.json();
  console.log("STATUS:", resp.status);
  console.log("CONTENT:\n" + (d.content || d.error || JSON.stringify(d).slice(0, 300)));
  console.log("\nTOOL RESULTS:", JSON.stringify(d.toolResults || []));

  // 同时验证页面 /ai 正常渲染（截图）
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1000"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/ai", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-ai-page.png" });
  console.log("\nAI page rendered OK");
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
