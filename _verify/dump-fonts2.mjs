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
    const gs = (el) => { const s = getComputedStyle(el); return { fs: s.fontSize, c: s.color, ff: s.fontFamily }; };
    const q = (s) => document.querySelector(s);
    return {
      cardTitle: gs(q(".card-title")),
      execCat: gs(q(".exec-cats li")),
      aiTag: gs(q(".ai-tag")),
      projName: gs(q('[data-od-id="card-projects"] .proj-name-text b')),
      studyMeta: gs(q(".study-meta")),
      noteTime: gs(q(".note-item em")),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
