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
  await exec.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-exec.png" });
  const proj = await page.$('[data-od-id="card-projects"]');
  await proj.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-proj.png" });
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\final-top2.png" });

  const info = await page.evaluate(() => {
    const exec = document.querySelector('[data-od-id="card-exec"]');
    const proj = document.querySelector('[data-od-id="card-projects"]');
    return {
      execText: exec.textContent.replace(/\s+/g, " ").trim(),
      execCatsHTML: exec.querySelector(".exec-cats").innerHTML.replace(/\s+/g, " "),
      execStatusHTML: exec.querySelector(".exec-status-list").innerHTML.replace(/\s+/g, " "),
      projText: proj.textContent.replace(/\s+/g, " ").trim().slice(0, 200),
      projHasTaskCount: /个任务/.test(proj.textContent),
      execBodyH: Math.round(exec.querySelector(".exec-body").getBoundingClientRect().height),
      execCardH: Math.round(exec.getBoundingClientRect().height),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
