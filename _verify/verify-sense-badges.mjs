import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1400"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1400, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));

  // 提取每个项目的行内容（名称/进度/徽标/最近活动）
  const rows = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    if (!card) return "CARD NOT FOUND";
    const out = [];
    card.querySelectorAll("li").forEach((li) => {
      out.push({
        text: li.textContent.replace(/\s+/g, " ").trim(),
        pills: Array.from(li.querySelectorAll(".sense-pill")).map((p) => p.textContent.trim()),
      });
    });
    return out;
  });
  console.log("PROJECT ROWS:");
  console.log(JSON.stringify(rows, null, 2));

  // 截图项目卡
  const el = await page.$('[data-od-id="card-projects"]');
  if (el) {
    const box = await el.boundingBox();
    console.log("card box:", Math.round(box.width), "x", Math.round(box.height), "y=", Math.round(box.y));
    await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-sense-badges.png" });
  }
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-sense-home.png", fullPage: false });

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
