// 验证：项目焦点卡新排版（图标锚点 + 文本进度 + 橙点状态）
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

// 准备：项目 + 3 任务（1 完成）
const proj = await api("createProject", { name: "卡片排版测试", desc: "测试项目描述", status: "active" });
const pid = proj.id;
const t1 = await api("createTask", { title: "排版-任务一", group: "must", projectId: pid });
await api("createTask", { title: "排版-任务二", group: "doing", projectId: pid });
await api("createTask", { title: "排版-任务三", group: "waiting", projectId: pid });
await api("toggleTask", { id: t1.id, done: true });
await api("setProjectFocus", { id: pid, isFocus: true });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);

  const card = await page.evaluate(() => {
    const c = document.querySelector(".focus-project-card");
    if (!c) return null;
    const txt = c.textContent;
    const ico = c.querySelector(".focus-ico");
    const state = c.querySelector(".state");
    const meta = c.querySelector(".focus-meta");
    return {
      hasIco: !!ico && ico.querySelector("svg") !== null,
      icoBox: ico ? `${Math.round(ico.getBoundingClientRect().width)}x${Math.round(ico.getBoundingClientRect().height)}` : null,
      hasMeta: txt.includes("来源：项目") && txt.includes("阶段：") && txt.includes("进度：33%") && txt.includes("任务：1/3"),
      hasLongBar: !!c.querySelector(".focus-progress"),
      hasStateDot: !!state && getComputedStyle(state, "::before").width !== "auto",
      hasList: txt.includes("主任务") && txt.includes("状态") && txt.includes("下一步"),
      hasBtns: txt.includes("继续工作") && txt.includes("提交成果"),
      nextIsTask2: txt.includes("排版-任务二"),
    };
  });
  console.log("card:", JSON.stringify(card));
  check("左侧有文件夹图标锚点（40x40）", card?.hasIco && card?.icoBox === "40x40", card?.icoBox);
  check("一行式元数据（来源/阶段/进度/任务）", card?.hasMeta);
  check("无长进度条（改文本标签）", card?.hasLongBar === false);
  check("状态带橙色圆点", card?.hasStateDot);
  check("右侧主任务/状态/下一步详情流", card?.hasList);
  check("下一步 = 未完成任务", card?.nextIsTask2);
  check("主次按钮齐全", card?.hasBtns);

  // 截图（全页）
  await page.screenshot({ path: "_verify/focus-card-v2.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理 */
await api("deleteProject", { id: pid });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
