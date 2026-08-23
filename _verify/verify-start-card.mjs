import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/today", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));

  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="start-card"]');
    if (!card) return { noCard: true };
    return {
      greet: card.querySelector(".start-greet")?.textContent,
      date: card.querySelector(".start-date")?.textContent,
      cols: [...card.querySelectorAll(".start-col-title")].map((t) => t.textContent),
      top3: [...card.querySelectorAll(".start-col:first-child .start-item-text")].map((t) => t.textContent),
      carry: [...card.querySelectorAll(".start-col:nth-child(2) .start-item-text")].map((t) => t.textContent),
      hint: card.querySelector(".start-hint")?.textContent,
      btn: card.querySelector(".start-btn")?.textContent.trim(),
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="start-card"]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8, width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 };
  });
  await page.screenshot({ path: "_verify/start-card.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
