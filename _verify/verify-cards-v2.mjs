import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,2200"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 2200, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));

  // 截图三个卡片
  const cards = ["card-exec", "card-projects", "card-notes"];
  for (const id of cards) {
    const el = await page.$(`[data-od-id="${id}"]`);
    if (el) {
      const box = await el.boundingBox();
      if (box) {
        await el.screenshot({ path: `C:\\Users\\34153\\.openclaw\\workspace\\shot-${id}.png` });
        console.log(`${id}: ${Math.round(box.width)}x${Math.round(box.height)} at y=${Math.round(box.y)}`);
      }
    } else {
      console.log(`${id}: NOT FOUND`);
    }
  }

  // 全页截图
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-full.png", fullPage: true });

  // 检查卡片内是否有滚动条（scrollHeight > clientHeight 且有 overflow-y auto）
  const scrollInfo = await page.evaluate(() => {
    const out = {};
    for (const id of ["card-exec", "card-projects", "card-notes"]) {
      const card = document.querySelector(`[data-od-id="${id}"]`);
      if (!card) { out[id] = "NOT FOUND"; continue; }
      const lists = card.querySelectorAll("ul");
      const info = [];
      lists.forEach((ul) => {
        const cs = getComputedStyle(ul);
        info.push({
          cls: ul.className,
          overflowY: cs.overflowY,
          scrollH: ul.scrollHeight,
          clientH: ul.clientHeight,
        });
      });
      out[id] = info;
    }
    return out;
  });
  console.log(JSON.stringify(scrollInfo, null, 2));

  // 检查底部链接文字
  const foots = await page.evaluate(() => {
    const out = {};
    for (const id of ["card-exec", "card-projects", "card-notes"]) {
      const card = document.querySelector(`[data-od-id="${id}"]`);
      const foot = card ? card.querySelector(".card-foot") : null;
      out[id] = foot ? foot.textContent.trim() : "NO FOOT";
    }
    return out;
  });
  console.log("FOOTS:", JSON.stringify(foots));

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
