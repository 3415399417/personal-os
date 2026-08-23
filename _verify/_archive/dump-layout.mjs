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
    const exec = document.querySelector('[data-od-id="card-exec"]');
    const r = exec.getBoundingClientRect();
    const cats = [...exec.querySelectorAll(".exec-cats li")].map((li) => {
      const rr = li.getBoundingClientRect();
      return { y: Math.round(rr.top - r.top), h: Math.round(rr.height) };
    });
    const stats = [...exec.querySelectorAll(".exec-status-list li")].map((li) => {
      const rr = li.getBoundingClientRect();
      return { y: Math.round(rr.top - r.top), h: Math.round(rr.height) };
    });
    const body = exec.querySelector(".exec-body").getBoundingClientRect();
    const foot = exec.querySelector(".card-foot").getBoundingClientRect();
    return {
      cardH: Math.round(r.height),
      bodyTop: Math.round(body.top - r.top),
      bodyH: Math.round(body.height),
      footTop: Math.round(foot.top - r.top),
      gapBetweenBodyAndFoot: Math.round(foot.top - body.bottom),
      cats,
      stats,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
