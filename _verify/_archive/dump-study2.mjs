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
    const s = document.querySelector('[data-od-id="card-study"]');
    const rows = [...s.querySelectorAll(".proj-list li")].map((li) => {
      const fill = li.querySelector(".progress i");
      return {
        text: li.textContent.replace(/\s+/g, " ").trim(),
        barW: fill ? fill.getAttribute("style") : null,
      };
    });
    return rows;
  });
  console.log(JSON.stringify(info, null, 2));
  const study = await page.$('[data-od-id="card-study"]');
  await study.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-study2.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
