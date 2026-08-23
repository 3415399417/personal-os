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

  const info = await page.evaluate(() => {
    const cards = ["card-exec", "card-projects", "card-resources", "card-study", "card-notes", "card-life"];
    const out = {};
    for (const id of cards) {
      const c = document.querySelector(`[data-od-id="${id}"]`);
      const img = c.querySelector(".card-title-ico");
      out[id] = {
        hasIco: !!img,
        src: img?.getAttribute("src"),
        loaded: img ? img.complete && img.naturalWidth > 0 : false,
        w: img ? Math.round(img.getBoundingClientRect().width) : 0,
        hasTextTitle: !!c.querySelector(".card-title"),
      };
    }
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\title-icons.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
