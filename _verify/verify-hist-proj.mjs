import puppeteer from "puppeteer-core";

const API = "http://localhost:3000/api/data";
async function call(action, payload) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return r.json();
}

(async () => {
  // 造一个"已完成 + 无任务"的项目（模拟导入的历史项目）
  const imp = await call("importProjects", { inputs: [{ name: "验证历史项目", folderPath: "E:\\我的项目\\ai-chat", status: "completed" }] });
  const proj = imp[0];
  console.log("imported:", JSON.stringify({ name: proj.name, status: proj.status, progress: proj.progress }));

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1200"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });

  // 项目列表：卡片显示
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));
  const card = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".mini-card"));
    const c = cards.find((x) => x.textContent.includes("验证历史项目"));
    if (!c) return null;
    return {
      text: c.textContent.replace(/\s+/g, " ").trim().slice(0, 80),
      progressNum: c.querySelector(".num")?.textContent,
      progressWidth: c.querySelector(".progress i")?.style.width,
    };
  });
  console.log("列表卡片:", JSON.stringify(card));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-hist-card.png" });

  // 详情页：空态 + 概览
  await page.goto(`http://localhost:3000/projects/${proj.id}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));
  const detail = await page.evaluate(() => {
    const overview = document.querySelector(".progress-label");
    const empty = document.querySelector(".empty-state, .empty-title");
    return {
      overview: overview ? overview.textContent.replace(/\s+/g, " ").trim() : null,
      emptyTitle: empty ? empty.textContent.replace(/\s+/g, " ").trim().slice(0, 60) : null,
    };
  });
  console.log("详情页:", JSON.stringify(detail));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-hist-detail.png" });

  await browser.close();
  // 清理
  await call("deleteProject", { id: proj.id });
  console.log("cleaned");
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
