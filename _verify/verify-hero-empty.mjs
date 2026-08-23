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

  const info = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="focus-task-card"]');
    if (!card) return { empty: true };
    const ico = card.querySelector(".empty-ico");
    const title = card.querySelector(".empty-title");
    const kai = card.querySelector(".empty-title-kai");
    const sub = card.querySelector(".empty-sub");
    const btns = [...card.querySelectorAll(".empty-btn")];
    const pick = (el) => {
      const c = getComputedStyle(el);
      return { bg: c.backgroundColor, color: c.color, radius: c.borderRadius, fs: c.fontSize };
    };
    const lr = card.querySelector(".empty-left").getBoundingClientRect();
    const ar = card.querySelector(".empty-actions").getBoundingClientRect();
    return {
      cardW: Math.round(card.getBoundingClientRect().width),
      ico: pick(ico),
      icoSize: getComputedStyle(ico).width,
      title: pick(title),
      kaiFont: getComputedStyle(kai).fontFamily.split(",")[0],
      kaiColor: getComputedStyle(kai).color,
      sub: pick(sub),
      btns: btns.map((b) => ({ text: b.textContent.trim(), ...pick(b) })),
      leftW: Math.round(lr.width),
      actionsW: Math.round(ar.width),
      align: getComputedStyle(card).alignItems,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  const rect = await page.evaluate(() => {
    const el = document.querySelector('[data-od-id="focus-task-card"]');
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x) - 8, y: Math.round(r.y) - 8, width: Math.round(r.width) + 16, height: Math.round(r.height) + 16 };
  });
  await page.screenshot({ path: "_verify/hero-empty-v1.png", clip: rect });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
