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
    const s = document.querySelector('[data-od-id="card-study"]');
    const firstLi = s.querySelector(".proj-list li:first-child");
    const bar = firstLi.querySelector(".progress");
    const fill = firstLi.querySelector(".progress i");
    const p = document.querySelector('[data-od-id="card-projects"] .progress i');
    const barRect = bar?.getBoundingClientRect();
    const fillRect = fill?.getBoundingClientRect();
    const pRect = p?.getBoundingClientRect();
    return {
      studyBar: barRect ? { w: Math.round(barRect.width), h: Math.round(barRect.height) } : null,
      studyFill: fillRect ? { w: Math.round(fillRect.width), style: fill.getAttribute("style") } : null,
      projFill: pRect ? { w: Math.round(pRect.width), style: p.getAttribute("style") } : null,
      barHTML: bar ? bar.outerHTML : "NO BAR",
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
