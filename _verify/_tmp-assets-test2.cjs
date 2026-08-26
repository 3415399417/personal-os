const puppeteer = require("puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://localhost:3000/assets", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));

  // 1. click card -> detail modal
  await page.evaluate(() => {
    document.querySelector(".mini-card").click();
  });
  await new Promise((r) => setTimeout(r, 600));
  let t = await page.evaluate(() => document.body.textContent || "");
  console.log("detail modal shown:", t.includes("资产详情"));
  console.log("detail has delete btn:", t.includes("删除"));

  // 2. click delete btn in detail -> confirm modal
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".modal-foot .btn-danger"));
    const b = btns.find((x) => (x.textContent || "").includes("删除"));
    if (!b) return false;
    b.click();
    return true;
  });
  console.log("clicked delete in detail:", clicked);
  await new Promise((r) => setTimeout(r, 600));
  t = await page.evaluate(() => document.body.textContent || "");
  console.log("confirm modal shown:", t.includes("确认删除资产"));

  // 3. cancel
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".modal-foot .btn-soft"));
    const b = btns.find((x) => (x.textContent || "").trim() === "取消");
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  t = await page.evaluate(() => document.body.textContent || "");
  console.log("no modal after cancel:", !t.includes("确认删除资产") && !t.includes("资产详情"));

  await browser.close();
})();
