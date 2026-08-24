import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,1200"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });

  // 1) 项目页导入弹窗：checkbox
  await page.goto("http://localhost:3000/projects", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent.includes("导入历史项目"));
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
  const chk = await page.evaluate(() => {
    const modal = Array.from(document.querySelectorAll(".modal")).find((m) => m.offsetParent !== null);
    const label = modal ? modal.querySelector(".import-gen-archive") : null;
    return {
      hasCheckbox: !!label,
      checked: label ? label.querySelector("input").checked : null,
      text: label ? label.textContent.replace(/\s+/g, " ").trim().slice(0, 60) : "",
    };
  });
  console.log("导入弹窗档案开关:", JSON.stringify(chk));
  await page.screenshot({ path: "C:\\Users\\34153\\.openclaw\\workspace\\shot-import-gen.png" });
  await browser.close();
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
