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
    const left = card.querySelector(".focus-left");
    const right = card.querySelector(".focus-right");
    const lr = left.getBoundingClientRect();
    const rr = right.getBoundingClientRect();
    const meta = card.querySelector(".focus-meta");
    const mc = getComputedStyle(meta);
    const pills = [...meta.querySelectorAll(".focus-meta-pill")].map((p) => Math.round(p.getBoundingClientRect().width));
    const btns = [...card.querySelectorAll(".focus-btns .btn")].map((b) => Math.round(b.getBoundingClientRect().width));
    const btnsRow = card.querySelector(".focus-btns").getBoundingClientRect();
    return {
      leftW: Math.round(lr.width),
      rightW: Math.round(rr.width),
      metaJustify: mc.justifyContent,
      metaGap: mc.gap,
      pillsW: pills,
      pillsTotal: pills.reduce((a, b) => a + b, 0),
      btnW: btns,
      btnsRowW: Math.round(btnsRow.width),
      desc: card.querySelector(".focus-desc").getBoundingClientRect().width,
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
