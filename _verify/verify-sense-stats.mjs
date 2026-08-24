import puppeteer from "puppeteer-core";

(async () => {
  // 1) API 检查
  const apiResp = await fetch("http://localhost:3000/api/stats", { cache: "no-store" });
  const api = await apiResp.json();
  console.log("API sense:", JSON.stringify(api.sense));

  // 2) 页面渲染
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1600"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1600, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/stats", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  const senseInfo = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll(".panel"));
    const sense = sections.find((s) => s.textContent.includes("进度感知"));
    if (!sense) return "SENSE PANEL NOT FOUND";
    return {
      text: sense.textContent.replace(/\s+/g, " ").trim().slice(0, 200),
      bigNum: sense.querySelector(".stats-sense-main b")?.textContent,
      bigNumClass: sense.querySelector(".stats-sense-main b")?.className,
    };
  });
  console.log("PAGE:", JSON.stringify(senseInfo, null, 2));

  const el = await page.$(".stats-sense");
  if (el) {
    const box = await el.boundingBox();
    console.log("sense box:", Math.round(box.width), "x", Math.round(box.height));
    // 截整个感知面板所在 section
    const section = await page.evaluateHandle(() => {
      const s = Array.from(document.querySelectorAll(".panel")).find((x) => x.textContent.includes("进度感知"));
      return s;
    });
    const sec = await section.asElement();
    if (sec) await sec.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-sense-stats.png" });
  }
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-stats-page.png" });

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
