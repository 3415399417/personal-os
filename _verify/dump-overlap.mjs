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
  await new Promise((r) => setTimeout(r, 3500));

  const info = await page.evaluate(() => {
    const checks = [
      { id: "card-projects", sel: ".proj-list li", imgSel: ".projects-art" },
      { id: "card-resources", sel: ".res-row-cell", imgSel: ".resources-art" },
      { id: "card-study", sel: ".proj-list li", imgSel: ".study-art" },
      { id: "card-notes", sel: ".note-item", imgSel: ".notes-art" },
    ];
    const out = {};
    for (const c of checks) {
      const card = document.querySelector(`[data-od-id="${c.id}"]`);
      const img = card.querySelector(c.imgSel);
      const ir = img.getBoundingClientRect();
      const items = [...card.querySelectorAll(c.sel)].map((el) => {
        const r = el.getBoundingClientRect();
        // 与插画矩形重叠？
        const overlap = !(r.right < ir.left || r.left > ir.right || r.bottom < ir.top || r.top > ir.bottom);
        return { text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 18), overlap };
      });
      out[c.id] = { img: { x: Math.round(ir.left), y: Math.round(ir.top), w: Math.round(ir.width) }, items };
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  const cards = ["card-projects", "card-resources", "card-study", "card-notes"];
  for (const id of cards) {
    const el = await page.$(`[data-od-id="${id}"]`);
    if (el) await el.screenshot({ path: `C:\\Users\\34153\\.openclaw\\workspace\\fix-${id}.png` });
  }
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
