import puppeteer from "puppeteer-core";
import fs from "fs";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.goto("about:blank");

  const filePath = "C:\\Users\\34153\\.openclaw\\media\\inbound\\像素卡通人物动作图生成_7---a7efdfe4-ea5a-4684-894c-1acb49716735.png";
  const buf = fs.readFileSync(filePath);
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

  const outDataUrl = await page.evaluate(async (src) => {
    const bmp = await createImageBitmap(await (await fetch(src)).blob());
    const c1 = document.createElement("canvas");
    c1.width = bmp.width;
    c1.height = bmp.height;
    const ctx1 = c1.getContext("2d");
    ctx1.drawImage(bmp, 0, 0);
    const img = ctx1.getImageData(0, 0, c1.width, c1.height);
    const data = img.data;
    const w = c1.width;
    const h = c1.height;

    const isWhite = (x, y) => {
      const i = (y * w + x) * 4;
      return data[i + 3] > 0 && data[i] > 233 && data[i + 1] > 233 && data[i + 2] > 233;
    };
    const visited = new Uint8Array(w * h);
    const queue = [];
    for (let x = 0; x < w; x++) {
      for (const y of [0, h - 1]) if (isWhite(x, y)) queue.push(y * w + x);
    }
    for (let y = 0; y < h; y++) {
      for (const x of [0, w - 1]) if (isWhite(x, y)) queue.push(y * w + x);
    }
    while (queue.length) {
      const idx = queue.pop();
      if (visited[idx]) continue;
      visited[idx] = 1;
      const x = idx % w;
      const y = (idx / w) | 0;
      if (!isWhite(x, y)) continue;
      data[idx * 4 + 3] = 0;
      if (x + 1 < w && !visited[idx + 1]) queue.push(idx + 1);
      if (x - 1 >= 0 && !visited[idx - 1]) queue.push(idx - 1);
      if (y + 1 < h && !visited[idx + w]) queue.push(idx + w);
      if (y - 1 >= 0 && !visited[idx - w]) queue.push(idx - w);
    }
    // 羽化
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] === 0) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 218 && g > 218 && b > 218) {
          const near = [
            x + 1 < w ? (y * w + x + 1) * 4 : -1,
            x - 1 >= 0 ? (y * w + x - 1) * 4 : -1,
            y + 1 < h ? ((y + 1) * w + x) * 4 : -1,
            y - 1 >= 0 ? ((y - 1) * w + x) * 4 : -1,
          ];
          if (near.some((n) => n >= 0 && data[n + 3] === 0)) {
            const whiteness = Math.min(r, g, b);
            let a = ((whiteness - 205) / 28) * 255;
            a = Math.max(0, Math.min(255, a));
            data[i + 3] = a;
          }
        }
      }
    }
    ctx1.putImageData(img, 0, 0);

    // 缩放到 512 宽（保持比例）
    const scale = 512 / w;
    const nw = 512;
    const nh = Math.round(h * scale);
    const c2 = document.createElement("canvas");
    c2.width = nw;
    c2.height = nh;
    const ctx2 = c2.getContext("2d");
    ctx2.imageSmoothingEnabled = false;
    ctx2.drawImage(c1, 0, 0, nw, nh);
    return { dataUrl: c2.toDataURL("image/png"), nw, nh };
  }, dataUrl);

  const base64 = outDataUrl.dataUrl.split(",")[1];
  const out = "E:\\我的项目\\personal-os\\public\\art\\study-read.png";
  fs.writeFileSync(out, Buffer.from(base64, "base64"));
  console.log(`saved ${out} (${outDataUrl.nw}x${outDataUrl.nh}, ${Buffer.from(base64, "base64").length} bytes)`);
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
