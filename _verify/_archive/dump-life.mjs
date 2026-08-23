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
      const ico = li.querySelector(".life-item-ico");
      return {
        text: li.textContent.replace(/\s+/g, " ").trim(),
        icoBg: ico ? getComputedStyle(ico).backgroundColor : null,
      };
    });
    const img = c.querySelector(".life-art");
    const ir = img ? img.getBoundingClientRect() : null;
    const cr = c.getBoundingClientRect();
    return {
      titleIco: !!c.querySelector(".life-title-ico"),
      title: c.querySelector(".card-title")?.textContent,
      items,
      hasOldOk: !!c.querySelector(".life-ok"),
      img: ir && cr ? { x: Math.round(ir.left - cr.left), y: Math.round(ir.top - cr.top), w: Math.round(ir.width), h: Math.round(ir.height), loaded: img.complete && img.naturalWidth > 0 } : null,
      foot: c.querySelector(".card-foot")?.textContent.trim(),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  const el = await page.$('[data-od-id="card-life"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-life.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
