import puppeteer from "puppeteer-core";
import fs from "fs";

const TARGETS = [
  { url: "http://localhost:3000/art/study-girl.png", out: "E:\\我的项目\\personal-os\\public\\art\\study-girl.png" },
  { url: "http://localhost:3000/art/life-relax.png", out: "E:\\我的项目\\personal-os\\public\\art\\life-relax.png" },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });

  for (const t of TARGETS) {
    const dataUrl = await page.evaluate(async (url) => {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bmp, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = img.data;
      const w = canvas.width;
      const h = canvas.height;

      const isWhite = (x, y) => {
        const i = (y * w + x) * 4;
        return data[i + 3] > 0 && data[i] > 233 && data[i + 1] > 233 && data[i + 2] > 233;
      };
      const visited = new Uint8Array(w * h);
      const queue = [];

      // 种子：四边白色像素
      for (let x = 0; x < w; x++) {
        for (const y of [0, h - 1]) if (isWhite(x, y)) queue.push(y * w + x);
      }
      for (let y = 0; y < h; y++) {
        for (const x of [0, w - 1]) if (isWhite(x, y)) queue.push(y * w + x);
      }

      // BFS：连通白色置透明
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

      // 边缘羽化：与透明相邻的浅色像素半透明
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

      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL("image/png");
    }, t.url);

    const base64 = dataUrl.split(",")[1];
    fs.writeFileSync(t.out, Buffer.from(base64, "base64"));
    console.log("saved", t.out, Buffer.from(base64, "base64").length, "bytes");
  }

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
