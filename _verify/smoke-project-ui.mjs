// UI 冒烟：打开项目详情页 → 检查状态点/展开按钮/展开区/时间线
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
  page.on("pageerror", (err) => errors.push(String(err.message).slice(0, 500)));

  await page.goto("http://127.0.0.1:3000/projects/cmt5oq7oj000e0ouvibxfdftk", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 4000));

  // 展开第一个任务
  await page.evaluate(() => {
    const btn = document.querySelector(".task-expand-btn");
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  const state = await page.evaluate(() => {
    return {
      url: location.pathname,
      dots: Array.from(document.querySelectorAll(".prog-dot")).map((d) => d.className),
      expandBtnCount: document.querySelectorAll(".task-expand-btn").length,
      expandOpen: !!document.querySelector(".task-expand"),
      artsText: document.querySelector(".task-expand-arts")?.value?.slice(0, 120) ?? "",
      timelineItems: Array.from(document.querySelectorAll(".task-timeline-item")).map((li) => li.textContent.slice(0, 60)),
      confirmBar: !!document.querySelector(".task-confirm-bar"),
      scanNotice: document.querySelector(".scan-notice")?.textContent ?? null,
      errors: 0,
    };
  });
  console.log(JSON.stringify(state, null, 2));
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
