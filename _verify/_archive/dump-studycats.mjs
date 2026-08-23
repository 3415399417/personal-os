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
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));

  const v = await page.evaluate(() => {
    const c = document.querySelector('[data-od-id="card-study"]');
    const items = [...c.querySelectorAll(".proj-line")].map((row) => {
      const img = row.querySelector(".study-cat-ico");
      const name = row.querySelector(".proj-name-text b");
      return {
        name: name ? name.textContent : null,
        src: img ? img.getAttribute("src") : null,
        loaded: img ? img.complete && img.naturalWidth > 0 : false,
        w: img ? Math.round(img.getBoundingClientRect().width) : 0,
        hasOldSvg: !!row.querySelector(".proj-ico svg"),
      };
    });
    return items;
  });
  console.log(JSON.stringify(v, null, 2));
  const el = await page.$('[data-od-id="card-study"]');
  await el.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\study-cats-ico.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
