import puppeteer from "puppeteer-core";
import fs from "fs";

const TARGETS = [
  { file: "image---c597d846-c1e4-438b-be3d-9ba0a7d923c7.png", out: "title-quick.png", name: "工作台" },
  { file: "image---b8149204-839c-4ef4-bd6b-5d4794e1e7d5.png", out: "title-ai.png", name: "AI" },
  { file: "image---cf06c958-429d-4979-9066-f2cb7a8c5ada.png", out: "title-assets.png", name: "资产库" },
];

const IN_DIR = "C:\\Users\\34153\\.openclaw\\media\\inbound";
const OUT_DIR = "E:\\我的项目\\personal-os\\public\\art";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.goto("about:blank");

  for (const t of TARGETS) {
    const buf = fs.readFileSync(`${IN_DIR}\\${t.file}`);
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    const out = await page.evaluate(async (src) => {
      const bmp = await createImageBitmap(await (await fetch(src)).blob());
      const w = bmp.width;
      const h = bmp.height;
      const c1 = document.createElement("canvas");
      c1.width = w;
      c1.height = h;
      const ctx1 = c1.getContext("2d");
      ctx1.drawImage(bmp, 0, 0);
      const img = ctx1.getImageData(0, 0, w, h);
      const data = img.data;

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
      ctx1.putImageData(img, 0, 0);

      const c2 = document.createElement("canvas");
      c2.width = w * 4;
      c2.height = h * 4;
      const ctx2 = c2.getContext("2d");
      ctx2.imageSmoothingEnabled = false;
      ctx2.drawImage(c1, 0, 0, c2.width, c2.height);
      return c2.toDataURL("image/png");
    }, dataUrl);

    const base64 = out.split(",")[1];
    fs.writeFileSync(`${OUT_DIR}\\${t.out}`, Buffer.from(base64, "base64"));
    console.log(`saved ${t.name} -> ${t.out} (${Buffer.from(base64, "base64").length} bytes)`);
  }

  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
