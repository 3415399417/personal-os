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

  const exec = await page.$('[data-od-id="card-exec"]');
  await exec.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-exec2.png" });

  const info = await page.evaluate(() => {
    const exec = document.querySelector('[data-od-id="card-exec"]');
    const r = exec.getBoundingClientRect();
    const cats = [...exec.querySelectorAll(".exec-cats li")].map((li) => {
      const rr = li.getBoundingClientRect();
      return { y: Math.round(rr.top - r.top), h: Math.round(rr.height), text: li.textContent.trim() };
    });
    const foot = exec.querySelector(".card-foot");
    const fr = foot.getBoundingClientRect();
    return {
      cardH: Math.round(r.height),
      hasRightCol: !!exec.querySelector(".exec-status, .exec-brace, .exec-status-list"),
      hasStatsText: /项/.test(exec.textContent),
      cats,
      footTop: Math.round(fr.top - r.top),
      footText: foot.textContent.trim(),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
