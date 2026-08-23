// 验证：今日执行列表卡片内滚动（无滚动条）
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -> " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 准备数据（任务多让列表内容充实）
const proj = await api("createProject", { name: "滚动验证项目", status: "active" });
const pid = proj.id;
await api("setProjectFocus", { id: pid, isFocus: true });
for (let i = 1; i <= 6; i++) {
  await api("createTask", { title: `[滚动]个人任务${i}`, group: "must" });
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);

  const info = await page.evaluate(() => {
    const list = document.querySelector('[data-od-id="card-exec"] .exec-list');
    if (!list) return null;
    return {
      canScroll: list.scrollHeight > list.clientHeight + 5,
      bar: getComputedStyle(list).scrollbarWidth,
      scrollH: list.scrollHeight,
      clientH: list.clientHeight,
    };
  });
  console.log("exec scroll:", JSON.stringify(info));
  check("exec-list 可上下滚动（scrollHeight > clientHeight）", info?.canScroll === true, `${info?.scrollH} > ${info?.clientH}`);
  check("无滚动条（scrollbar-width: none）", info?.bar === "none", info?.bar);
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
const tasks = await api("getTodayTasks", null);
for (const t of tasks.filter((x) => x.text.startsWith("[滚动]"))) {
  await api("deleteTodo", { id: t.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
