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
  await new Promise((r) => setTimeout(r, 3500));

  const info = await page.evaluate(async () => {
    const load = async (url) => {
      const bmp = await createImageBitmap(await (await fetch(url)).blob());
      return { w: bmp.width, h: bmp.height, ratio: (bmp.width / bmp.height).toFixed(2) };
    };
    const exec = await load("/art/study-girl.png");
    const proj = await load("/art/projects-code.png");
    // 计算 projects 插画的实际显示尺寸（object-fit contain）
    const img = document.querySelector('[data-od-id="card-projects"] .projects-art');
    const r = img.getBoundingClientRect();
    // 非透明像素范围（估算主体占比）
    const bmp = await createImageBitmap(await (await fetch("/art/projects-code.png")).blob());
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    let minX = bmp.width, minY = bmp.height, maxX = 0, maxY = 0;
    for (let y = 0; y < bmp.height; y += 4) {
      for (let x = 0; x < bmp.width; x += 4) {
        if (d[(y * bmp.width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return {
      exec: { w: exec.w, h: exec.h, ratio: exec.ratio },
      proj: { w: proj.w, h: proj.h, ratio: proj.ratio },
      projDisplay: { w: Math.round(r.width), h: Math.round(r.height) },
      projBody: { minX, minY, maxX, maxY, bodyW: maxX - minX, bodyH: maxY - minY },
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
