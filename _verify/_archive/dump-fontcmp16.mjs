import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1200,300"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 300 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1180;
    canvas.height = 260;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 1180, 260);
    ctx.textBaseline = "top";
    ctx.fillStyle = "#111";
    ctx.font = '16px "KaiTi", "楷体", serif';
    ctx.fillText("楷体16px：今日执行 必须完成 进行中 等待处理 7项已完成", 20, 20);
    ctx.font = '16px sans-serif';
    ctx.fillText("黑体16px：今日执行 必须完成 进行中 等待处理 7项已完成", 20, 60);
    ctx.font = '16px "KaiTi", serif';
    ctx.fillText("楷体16px：BetterLife AI 项目 笔记 昨天21:35", 20, 100);
    ctx.font = '16px sans-serif';
    ctx.fillText("黑体16px：BetterLife AI 项目 笔记 昨天21:35", 20, 140);
    ctx.font = '16px "KaiTi", serif';
    ctx.fillText("楷体16px：学习计划 进行中1项 知识卡片 今日复习0条", 20, 180);
    ctx.font = '16px sans-serif';
    ctx.fillText("黑体16px：学习计划 进行中1项 知识卡片 今日复习0条", 20, 220);
    document.body.innerHTML = "";
    document.body.appendChild(canvas);
    canvas.toBlob(async (b) => {
      const arr = new Uint8Array(await b.arrayBuffer());
      window.__buf = arr;
    });
  });
  await new Promise((r) => setTimeout(r, 1000));
  const buf = await page.evaluate(() => Array.from(window.__buf));
  const fs = await import("fs");
  fs.writeFileSync("C:\\Users\\34153\\.openclaw\\workspace\\font-compare16.png", Buffer.from(buf));
  console.log("saved", buf.length);
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
