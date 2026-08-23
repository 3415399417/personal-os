import puppeteer from "puppeteer-core";
import fs from "fs";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });

  const outDataUrl = await page.evaluate(async () => {
    const bmp = await createImageBitmap(await (await fetch("/art/projects-code.png")).blob());
    const w = bmp.width;
    const h = bmp.height;
    // 检测非透明主体的底部（留 4px 边距）
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    let maxY = 0;
    for (let y = h - 1; y >= 0; y -= 2) {
      let rowHas = false;
      for (let x = 0; x < w; x += 2) {
        if (d[(y * w + x) * 4 + 3] > 10) { rowHas = true; break; }
      }
      if (rowHas) { maxY = y; break; }
    }
    const newH = Math.min(h, maxY + 4);
    // 裁掉底部空白
    const c2 = document.createElement("canvas");
    c2.width = w;
    c2.height = newH;
    const ctx2 = c2.getContext("2d");
    ctx2.imageSmoothingEnabled = false;
    ctx2.drawImage(bmp, 0, 0, w, newH, 0, 0, w, newH);
    return { dataUrl: c2.toDataURL("image/png"), newH };
  });

  const base64 = outDataUrl.dataUrl.split(",")[1];
  const out = "E:\\我的项目\\personal-os\\public\\art\\projects-code.png";
  fs.writeFileSync(out, Buffer.from(base64, "base64"));
  console.log("saved", out, outDataUrl.newH, "tall");
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
