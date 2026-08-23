import puppeteer from "puppeteer-core";
import fs from "fs";

const TARGETS = [
  { file: "image---f29c8e64-b2d0-4ddc-bc11-7bfc1642931b.png", out: "title-exec.png", name: "今日执行" },
  { file: "image---a0b90be6-6afd-4854-86f8-e050e4bd0a90.png", out: "title-projects.png", name: "当前项目" },
  { file: "image---6ba22ce1-3a71-4725-96f8-651383e17366.png", out: "title-resources.png", name: "资源中心" },
  { file: "image---93a7748d-5ab4-4ad6-b268-8f9d3f1508c2.png", out: "title-study.png", name: "学习与成长" },
  { file: "image---10def40b-7dd7-49bc-9cb3-39afdda77274.png", out: "title-notes.png", name: "最近沉淀" },
  { file: "image---3043a104-00d6-4d94-ad48-1d0b2194b758.png", out: "title-life.png", name: "生活与自我" },
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
      // 裁剪图标区域：上半 62%（去掉下方文字）
      const cropH = Math.round(h * 0.62);
      const c1 = document.createElement("canvas");
      c1.width = w;
      c1.height = cropH;
      const ctx1 = c1.getContext("2d");
      ctx1.imageSmoothingEnabled = false;
      ctx1.drawImage(bmp, 0, 0, w, cropH, 0, 0, w, cropH);
      const img = ctx1.getImageData(0, 0, w, cropH);
      const data = img.data;

      // 抠白底（BFS）
      const isWhite = (x, y) => {
        const i = (y * w + x) * 4;
        return data[i + 3] > 0 && data[i] > 233 && data[i + 1] > 233 && data[i + 2] > 233;
      };
      const visited = new Uint8Array(w * cropH);
      const queue = [];
      for (let x = 0; x < w; x++) {
        for (const y of [0, cropH - 1]) if (isWhite(x, y)) queue.push(y * w + x);
      }
      for (let y = 0; y < cropH; y++) {
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
        if (y + 1 < cropH && !visited[idx + w]) queue.push(idx + w);
        if (y - 1 >= 0 && !visited[idx - w]) queue.push(idx - w);
      }
      ctx1.putImageData(img, 0, 0);

      // 放大 4 倍（像素风 NearestNeighbor）
      const scale = 4;
      const c2 = document.createElement("canvas");
      c2.width = w * scale;
      c2.height = cropH * scale;
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
