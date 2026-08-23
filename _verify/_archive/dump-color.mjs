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
    const pname = document.querySelector('[data-od-id="card-projects"] .proj-name');
    const ptext = document.querySelector('[data-od-id="card-projects"] .proj-name-text');
    const pb = document.querySelector('[data-od-id="card-projects"] .proj-name-text b');
    const sm = document.querySelector(".study-meta");
    const cs = getComputedStyle(pname);
    return {
      projName: gs(pname),
      projNameText: gs(ptext),
      projNameB: gs(pb),
      studyMeta: gs(sm),
      // 命中 proj-name 的规则
      matchedRules: [...document.styleSheets].flatMap((sh) => {
        try { return [...sh.cssRules].map((r) => r.cssText); } catch { return []; }
      }).filter((t) => t.includes("proj-name") && (t.includes("color") || t.includes("font-size"))).slice(0, 15),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
