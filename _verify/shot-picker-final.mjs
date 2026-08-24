import puppeteer from "puppeteer-core";

(async () => {
  const projId = "cmt5oq7oj000e0ouvibxfdftk";
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1400"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1400, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:3000/projects/${projId}`, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  // 展开目标任务 + 打开反选弹窗
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".task-item"));
    for (const it of items) {
      const t = it.querySelector(".task-text");
      if (t && t.textContent.includes("完善文档")) { it.click(); break; }
    }
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".task-expand-actions button"));
    const b = btns.find((x) => x.textContent.includes("从实际文件反选"));
    b.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-picker-final.png" });

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
