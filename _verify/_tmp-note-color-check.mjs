// 检查新建笔记弹窗 + 笔记列表的实际文字颜色
import puppeteer from "puppeteer-core";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "http://127.0.0.1:3000";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + "/notes", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(2500);

  // 打开新建弹窗
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("新建笔记"));
    if (b) b.click();
  });
  await sleep(1000);

  const styles = await page.evaluate(() => {
    const title = document.querySelector("#nn-title");
    const content = document.querySelector("#nn-content");
    const label = document.querySelector(".modal .field-label");
    const cs = (el) => el ? getComputedStyle(el).color : null;
    return {
      titleColor: cs(title),
      contentColor: cs(content),
      labelColor: cs(label),
      titleClass: title?.className,
      contentClass: content?.className,
      modalBg: document.querySelector(".modal") ? getComputedStyle(document.querySelector(".modal")).backgroundColor : null,
    };
  });
  console.log("弹窗内颜色:", JSON.stringify(styles, null, 1));

  // 笔记列表标题颜色
  const listColors = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".note-item b")].slice(0, 5);
    return items.map((b) => ({ text: b.textContent.slice(0, 15), color: getComputedStyle(b).color }));
  });
  console.log("列表标题颜色:", JSON.stringify(listColors, null, 1));

  // 先关掉弹窗
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".modal button")].find((x) => x.textContent.includes("取消"));
    if (btn) btn.click();
  });
  await sleep(500);

  // 截个图
  await page.screenshot({ path: "E:\\我的项目\\personal-os\\_verify\\_tmp-note-color.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
