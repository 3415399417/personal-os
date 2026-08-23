import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const logs = [];
  page.on("console", (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));
  page.on("requestfailed", (req) => logs.push(`[reqfail] ${req.url()} ${req.failure()?.errorText}`));
  page.on("response", (res) => {
    if (res.url().includes("/api/")) logs.push(`[api] ${res.status()} ${res.url()}`);
  });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3500));

  const state = await page.evaluate(() => {
    const exec = document.querySelector('[data-od-id="card-exec"]');
    const proj = document.querySelector('[data-od-id="card-projects"]');
    return {
      execEmpty: exec?.textContent.includes("还没有执行记录"),
      projEmpty: proj?.textContent.includes("还没有项目"),
      projItems: proj?.querySelectorAll(".proj-line").length ?? -1,
      execCats: exec?.querySelectorAll(".exec-cats li").length ?? -1,
      bodyHeight: document.body.scrollHeight,
      cssLoaded: [...document.styleSheets].map((s) => s.href).filter(Boolean),
    };
  });
  console.log("STATE:", JSON.stringify(state, null, 2));
  console.log("LOGS:", logs.slice(-25).join("\n"));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
