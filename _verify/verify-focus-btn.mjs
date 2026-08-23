// 验证：项目详情页「设为今日焦点」按钮横排正常 + 点击切换
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

const proj = await api("createProject", { name: "按钮形态测试", status: "active" });
const pid = proj.id;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);

  // 按钮形态：横排（宽 > 高），文字在一行
  const shape = await page.evaluate(() => {
    const btn = document.querySelector(".proj-focus-btn");
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), text: btn.textContent.trim() };
  });
  console.log("shape:", JSON.stringify(shape));
  check("按钮为横排（宽 > 高）", shape && shape.w > shape.h, `${shape?.w}x${shape?.h}`);
  check("文字一行显示「设为今日焦点」", shape?.text === "设为今日焦点", shape?.text);

  // 点击 → 变「今日焦点」实心态
  await page.evaluate(() => document.querySelector(".proj-focus-btn").click());
  await sleep(1000);
  const onState = await page.evaluate(() => {
    const btn = document.querySelector(".proj-focus-btn");
    return { text: btn?.textContent.trim(), on: btn?.classList.contains("on"), bg: getComputedStyle(btn).backgroundColor };
  });
  console.log("on state:", JSON.stringify(onState));
  check("点击后文字变「今日焦点」", onState.text === "今日焦点", onState.text);
  check("点击后变实心紫色（on 类）", onState.on === true);

  // 再点 → 取消
  await page.evaluate(() => document.querySelector(".proj-focus-btn").click());
  await sleep(1000);
  const offState = await page.evaluate(() => {
    const btn = document.querySelector(".proj-focus-btn");
    return { text: btn?.textContent.trim(), on: btn?.classList.contains("on") };
  });
  check("再点击取消焦点恢复原态", offState.text === "设为今日焦点" && offState.on === false, JSON.stringify(offState));

  await page.screenshot({ path: "_verify/focus-btn-fixed.png", clip: { x: 200, y: 90, width: 1000, height: 300 } });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

await api("deleteProject", { id: pid });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
