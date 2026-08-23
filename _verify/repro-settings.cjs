// 复现 /settings 页面异常：打开页面截图 + 检查 DOM 内容
import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`[pageerror] ${String(e.message).slice(0, 300)}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[console] ${m.text().slice(0, 300)}`); });

  await page.goto("http://127.0.0.1:3000/settings", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const state = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll("svg")).map((s, i) => ({
      i,
      w: s.getAttribute("width"),
      h: s.getAttribute("height"),
      cls: s.getAttribute("class")?.slice(0, 40),
      viewBox: s.getAttribute("viewBox"),
      parent: s.parentElement?.tagName + "." + (s.parentElement?.className?.toString?.().slice(0, 30) ?? ""),
      inViewport: (() => {
        const r = s.getBoundingClientRect();
        return r.width > 100 || r.height > 100;
      })(),
    }));
    return {
      title: document.title,
      hasApp: !!document.querySelector(".app"),
      hasSettings: /个人信息|暗色模式|数据管理/.test(document.body.innerText),
      bodyTextLen: document.body.innerText.length,
      bodyText: document.body.innerText.slice(0, 200),
      bigSvgs: svgs.filter((s) => s.inViewport),
      svgCount: svgs.length,
    };
  });
  console.log(JSON.stringify(state, null, 2));
  console.log("errors:", errors.length ? errors : "无");
  await page.screenshot({ path: "E:\\我的项目\\personal-os\\_verify\\settings-repro.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
