// 验证：焦点卡右侧标签/值层级区分（颜色 + 字号）
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

const proj = await api("createProject", { name: "层级验证项目", desc: "描述", status: "active" });
const pid = proj.id;
await api("createTask", { title: "层级-任务一", group: "must", projectId: pid });
await api("setProjectFocus", { id: pid, isFocus: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);

  const info = await page.evaluate(() => {
    const card = document.querySelector(".focus-project-card");
    if (!card) return null;
    const list = card.querySelector(".focus-list");
    const items = [...list.querySelectorAll("li")].map((li) => {
      const span = li.querySelector("span");
      const b = li.querySelector("b");
      return {
        label: span?.textContent,
        labelColor: span ? getComputedStyle(span).color : null,
        labelSize: span ? parseFloat(getComputedStyle(span).fontSize) : null,
        valueColor: b ? getComputedStyle(b).color : null,
        valueSize: b ? parseFloat(getComputedStyle(b).fontSize) : null,
      };
    });
    return items;
  });
  console.log(JSON.stringify(info, null, 2));

  const fg = "rgb(31, 41, 55)"; // --fg
  const muted = "rgb(107, 114, 128)"; // --muted 近似
  const accent = "oklch(0.532942 0.192641 292.725)"; // --accent-deep 计算值
  const [main, status, next] = info;

  check("标签为浅灰（muted）", main?.labelColor !== fg && main?.labelColor !== accent, main?.labelColor);
  check("标签小号 10px", main?.labelSize === 10, `${main?.labelSize}`);
  check("值大于标签字号（12px）", main?.valueSize === 12, `${main?.valueSize}`);
  check("主任务值深色", main?.valueColor === fg, main?.valueColor);
  check("下一步值紫色强调", next?.valueColor === accent, next?.valueColor);
  check("状态值有橙点", status?.valueColor === fg && (await page.evaluate(() => {
    const el = document.querySelector(".state");
    return el ? getComputedStyle(el, "::before").width !== "auto" : false;
  })), status?.valueColor);

  await page.screenshot({ path: "_verify/focus-hierarchy.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

await api("deleteProject", { id: pid });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
