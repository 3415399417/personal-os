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
    const gs = (el) => { const s = getComputedStyle(el); return { fs: s.fontSize, c: s.color, fw: s.fontWeight }; };
    const q = (sel) => document.querySelector(sel);
    const out = {};
    out.cardTitle = gs(q(".card-title"));
    const cats = [...document.querySelectorAll(".exec-cats li")].map((li) => ({ text: li.textContent.trim(), ...gs(li) }));
    out.execCats = cats;
    out.execStatus = gs(q(".exec-status-list li"));
    out.execStatusB = gs(q(".exec-status-list b"));
    out.projName = gs(q('[data-od-id="card-projects"] .proj-name-text b'));
    out.projNum = gs(q('[data-od-id="card-projects"] .proj-line .num'));
    out.studyName = gs(q('[data-od-id="card-study"] .proj-name-text b'));
    out.studyMeta = gs(q(".study-meta"));
    out.noteTitle = gs(q(".note-item b"));
    out.noteTime = gs(q(".note-item em"));
    out.lifeTitle = gs(q(".life-item b"));
    out.lifeMeta = gs(q(".life-item em"));
    out.assetTitle = gs(q(".asset-item b"));
    out.assetNum = gs(q(".asset-item .num"));
    out.resLabel = gs(q(".res-cell span"));
    out.quick = gs(q(".quick-item"));
    out.aiTag = gs(q(".ai-tag"));
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
