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
      { id: "card-projects", sel: ".proj-list" },
      { id: "card-resources", sel: ".res-grid2" },
      { id: "card-study", sel: ".proj-list" },
      { id: "card-notes", sel: ".note-list" },
    ];
    const out = {};
    for (const c of checks) {
      const card = document.querySelector(`[data-od-id="${c.id}"]`);
      const list = card.querySelector(c.sel);
      const cs = getComputedStyle(list);
      const lr = list.getBoundingClientRect();
      out[c.id] = {
        paddingRight: cs.paddingRight,
        width: Math.round(lr.width),
        right: Math.round(lr.right),
      };
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
