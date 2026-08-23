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
    const card = document.querySelector('[data-od-id="card-life"]');
    const items = [...card.querySelectorAll(".life-item")].map((li) => {
      const img = li.querySelector(".life-item-ico");
      return {
        label: li.querySelector("b")?.textContent,
        desc: li.querySelector("em")?.textContent,
        tag: img?.tagName,
        src: img?.getAttribute("src"),
        w: img ? getComputedStyle(img).width : null,
        h: img ? getComputedStyle(img).height : null,
        naturalW: img?.naturalWidth,
        naturalH: img?.naturalHeight,
        broken: img instanceof HTMLImageElement ? img.complete && img.naturalWidth === 0 : null,
        radius: img ? getComputedStyle(img).borderRadius : null,
      };
    });
    return items;
  });
  console.log(JSON.stringify(info, null, 2));

  await page.screenshot({ path: "_verify/life-card-pixel-icons.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
