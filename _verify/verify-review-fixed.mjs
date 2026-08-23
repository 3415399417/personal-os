import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto("http://localhost:3000/review", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  // 1. 点击"生成日报"看折叠
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("生成日报"))?.click();
  });
  await new Promise((r) => setTimeout(r, 9000));
  const fold = await page.evaluate(() => {
    const rt = document.querySelector(".report-text");
    if (!rt) return null;
    return {
      collapsed: rt.className.includes("collapsed"),
      toggleBtn: [...document.querySelectorAll("button")].some((b) => b.textContent.includes("展开全文")),
      textLen: rt.textContent.length,
    };
  });
  console.log("FOLD:", JSON.stringify(fold));
  // 展开
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("展开全文"))?.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  const expanded = await page.evaluate(() => {
    const rt = document.querySelector(".report-text");
    return rt ? !rt.className.includes("collapsed") : false;
  });
  console.log("EXPANDED:", expanded);

  // 2. 点击复盘卡片 → 详情弹窗
  await page.evaluate(() => {
    document.querySelector(".review-card")?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  const detail = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal, [class*='modal']")].find((m) => m.textContent.includes("复盘详情"));
    if (!modal) return { found: false };
    return {
      found: true,
      hasSummary: modal.textContent.includes("总结"),
      title: modal.querySelector(".review-detail-head b")?.textContent,
    };
  });
  console.log("DETAIL_MODAL:", JSON.stringify(detail));
  await page.screenshot({ path: "_verify/review-fixed.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
