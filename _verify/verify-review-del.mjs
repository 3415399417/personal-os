import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1200"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/review", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));

  // 打开第一条复盘详情
  await page.evaluate(() => {
    const card = document.querySelector(".review-card");
    if (card) card.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const info = await page.evaluate(() => {
    const modal = Array.from(document.querySelectorAll(".modal")).find((m) => m.offsetParent !== null);
    if (!modal) return { open: false };
    const delBtn = Array.from(modal.querySelectorAll("button")).find((b) => b.textContent.trim() === "删除");
    return {
      open: true,
      hasDelBtn: !!delBtn,
      delBtnColor: delBtn ? getComputedStyle(delBtn).color : "",
      title: modal.querySelector(".review-detail-head b")?.textContent?.trim() ?? "",
    };
  });
  console.log("详情弹窗:", JSON.stringify(info));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-review-del.png" });

  // 点击删除 → 确认弹窗
  if (info.hasDelBtn) {
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const b = btns.find((x) => x.textContent.trim() === "删除");
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const confirm = await page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll(".modal")).filter((m) => m.offsetParent !== null);
      return modals.some((m) => m.textContent.replace(/\s+/g, " ").includes("确认删除复盘"));
    });
    console.log("确认弹窗:", confirm);
    // 取消（不真删用户数据）
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll(".modal button"));
      const b = btns.find((x) => x.textContent.trim() === "取消");
      if (b) b.click();
    });
  }
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
