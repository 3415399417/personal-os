import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-life"]');
    const items = [...c.querySelectorAll(".life-item")].map((li) => {
      const s = getComputedStyle(li);
      const ico = li.querySelector(".life-item-ico");
      return {
        text: li.textContent.replace(/\s+/g, " ").trim().slice(0, 12),
        bg: s.backgroundColor,
        border: s.borderTop,
      };
    });
    const img = c.querySelector(".life-art");
    const ir = img.getBoundingClientRect();
    const execImg = document.querySelector(".exec-art");
    const er = execImg.getBoundingClientRect();
    return {
      items,
      lifeImg: { w: Math.round(ir.width), h: Math.round(ir.height) },
      execImg: { w: Math.round(er.width), h: Math.round(er.height) },
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
