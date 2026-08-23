// 验证新交互：点击任务行=展开详情；点击复选框=勾选完成
import puppeteer from "puppeteer-core";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err.message).slice(0, 400)));

  await page.goto("http://127.0.0.1:3000/projects/cmt5oq7oj000e0ouvibxfdftk", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const readState = () =>
    page.evaluate(() => ({
      expanded: !!document.querySelector(".task-expand"),
      firstDone: document.querySelector(".task-item")?.classList.contains("done") ?? false,
    }));

  const before = await readState();
  console.log("初始:", JSON.stringify(before));

  // 1. 点击任务行空白处（task-body）→ 应展开而非勾选
  await page.evaluate(() => {
    const body = document.querySelector(".task-item .task-body");
    body.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await new Promise((r) => setTimeout(r, 1200));
  const afterRowClick = await readState();
  console.log("点行后:", JSON.stringify(afterRowClick));

  // 2. 点击复选框 → 应切换勾选状态
  await page.evaluate(() => {
    const check = document.querySelector(".task-item .task-check");
    check.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await new Promise((r) => setTimeout(r, 1200));
  const afterCheckClick = await readState();
  console.log("点复选框后:", JSON.stringify(afterCheckClick));

  // 3. 复原
  await page.evaluate(() => {
    const check = document.querySelector(".task-item .task-check");
    check.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await new Promise((r) => setTimeout(r, 1000));

  const okRow = afterRowClick.expanded && afterRowClick.firstDone === before.firstDone;
  const okCheck = afterCheckClick.firstDone !== before.firstDone;
  console.log("=== 结论 ===");
  console.log("点行展开且未误勾选:", okRow ? "✅" : "❌", JSON.stringify({ expanded: afterRowClick.expanded, doneChanged: afterRowClick.firstDone !== before.firstDone }));
  console.log("点复选框切换完成:", okCheck ? "✅" : "❌");
  console.log("pageerrors:", errors.length ? errors : "none");
  await browser.close();
  process.exit(okRow && okCheck ? 0 : 1);
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
