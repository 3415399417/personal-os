import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=900,400"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 400 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));

  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 880;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 880, 360);
    ctx.textBaseline = "top";
    ctx.fillStyle = "#111";
    ctx.font = '56px "KaiTi", "楷体", serif';
    ctx.fillText("楷体测试：今日执行 必须完成", 20, 20);
    ctx.font = '56px "楷体"';
    ctx.fillText("楷体二：今天的学习计划", 20, 110);
    ctx.font = '56px sans-serif';
    ctx.fillText("黑体对比：今日执行 必须完成", 20, 200);
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
  fs.writeFileSync("C:\\Users\\34153\\.openclaw\\workspace\\font-compare.png", Buffer.from(buf));
  console.log("saved", buf.length);
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
