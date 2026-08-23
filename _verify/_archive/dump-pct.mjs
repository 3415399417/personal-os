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
    const w = window.innerWidth;
    const out = {};
    for (const [rowId, names] of [
      ["row-today", ["card-exec", "card-projects", "card-resources"]],
      ["row-growth", ["card-study", "card-notes", "card-life"]],
    ]) {
      const row = document.querySelector(`[data-od-id="${rowId}"]`);
      out[rowId] = names.map((id) => {
        const el = row.querySelector(`[data-od-id="${id}"]`);
        const r = el.getBoundingClientRect();
        return { name: id, w: Math.round(r.width), pct: ((r.width / w) * 100).toFixed(1) };
      });
    }
    return { viewportW: w, out };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\pct26.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
