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

  const v = await page.evaluate(() => {
    const ids = ["card-quick", "card-ai", "card-assets"];
    const out = {};
    for (const id of ids) {
      const c = document.querySelector(`[data-od-id="${id}"]`);
      const img = c.querySelector(".card-title-ico");
      const t = c.querySelector(".card-title");
      out[id] = {
        ico: img ? img.getAttribute("src") : null,
        loaded: img ? img.complete && img.naturalWidth > 0 : false,
        text: t ? t.textContent : null,
        gap: (() => {
          if (!img || !t) return null;
          const ir = img.getBoundingClientRect();
          const tr = t.getBoundingClientRect();
          return Math.round(tr.left - ir.right);
        })(),
      };
    }
    return out;
  });
  console.log(JSON.stringify(v, null, 2));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\title-row3.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
