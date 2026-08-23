import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));
  const out = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="focus-card"]');
    const cs = getComputedStyle(card);
    return {
      display: cs.display,
      flexDirection: cs.flexDirection,
      maxWidth: cs.maxWidth,
      width: cs.width,
      alignSelf: cs.alignSelf,
      heroOd: document.querySelector('[data-od-id="hero"]') !== null,
      cardParent: card.parentElement.className,
    };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
