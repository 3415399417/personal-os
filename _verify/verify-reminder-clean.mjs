// 验证：提醒列表不再显示「系统提醒」副文字，只显示任务+时间
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = "http://localhost:3000";

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -> " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);

  const res = await page.evaluate(() => {
    const sec = document.querySelector('[data-od-id="sidebar-reminders"]');
    const txt = sec ? sec.textContent : "";
    const items = [...(sec?.querySelectorAll(".remind-item") ?? [])].map((li) => ({
      main: li.querySelector(".remind-main b")?.textContent ?? "",
      em: li.querySelector(".remind-main em")?.textContent ?? null,
      time: li.querySelector(".remind-time")?.textContent ?? "",
    }));
    return { txt, items };
  });

  check("列表条目无「系统提醒」副文字", res.items.every((i) => !i.main.includes("系统提醒")), JSON.stringify(res.items));
  check(
    "每条提醒仅剩 任务+时间",
    res.items.every((i) => i.em === null && i.time.includes("今天") || i.time.includes("明天")),
    JSON.stringify(res.items),
  );
  console.log("items:", JSON.stringify(res.items, null, 2));

  await page.screenshot({ path: "_verify/reminder-clean-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
