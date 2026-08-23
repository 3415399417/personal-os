// 验证：项目位置（设置路径 → 显示 → 打开文件夹 → 错误处理）
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

const proj = await api("createProject", { name: "路径测试项目", status: "active" });
const pid = proj.id;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(2500);

  /* 1. 初始：显示「未设置」+ 设置路径按钮 */
  const init = await page.evaluate(() => {
    const row = document.querySelector(".proj-path-row");
    return row ? row.textContent : "no row";
  });
  check("概览面板显示项目位置行（未设置）", init.includes("项目位置") && init.includes("未设置") && init.includes("设置路径"), init);

  /* 2. 点设置路径 → 输入 → 保存 */
  await page.evaluate(() => {
    [...document.querySelectorAll(".proj-path-row button")].find((b) => b.textContent.includes("设置路径")).click();
  });
  await sleep(300);
  await page.type(".proj-path-edit .input", "E:\\我的项目\\外贸AI系统");
  await page.evaluate(() => {
    [...document.querySelectorAll(".proj-path-edit button")].find((b) => b.textContent.trim() === "保存").click();
  });
  await sleep(900);
  const saved = await page.evaluate(() => {
    const row = document.querySelector(".proj-path-row");
    const txt = row ? row.textContent : "";
    return {
      shows: txt.includes("E:\\我的项目\\外贸AI系统"),
      hasOpen: txt.includes("打开文件夹"),
      hasEdit: txt.includes("编辑"),
    };
  });
  check("保存后显示路径 + 打开文件夹按钮", saved.shows && saved.hasOpen && saved.hasEdit, JSON.stringify(saved));

  // API 确认持久化
  const p = await api("getProject", { id: pid });
  check("数据库 folderPath 已保存", p.folderPath === "E:\\我的项目\\外贸AI系统", p.folderPath);

  /* 3. 错误路径 → 打开报错 */
  await page.evaluate(() => {
    [...document.querySelectorAll(".proj-path-row button")].find((b) => b.textContent.includes("编辑")).click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const input = document.querySelector(".proj-path-edit .input");
    input.value = "Z:\\不存在的文件夹\\xx";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.evaluate(() => {
    [...document.querySelectorAll(".proj-path-edit button")].find((b) => b.textContent.trim() === "保存").click();
  });
  await sleep(900);
  await page.evaluate(() => {
    [...document.querySelectorAll(".proj-path-row button")].find((b) => b.textContent.includes("打开文件夹")).click();
  });
  await sleep(900);
  const errShown = await page.evaluate(() => {
    const el = document.querySelector(".proj-path-error");
    return el ? el.textContent.includes("文件夹不存在") : false;
  });
  check("不存在的路径点击打开提示错误", errShown);

  /* 4. 改回真实路径（E:\我的项目 存在）→ 打开返回成功 */
  await page.evaluate(() => {
    [...document.querySelectorAll(".proj-path-row button")].find((b) => b.textContent.includes("编辑")).click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const input = document.querySelector(".proj-path-edit .input");
    input.value = "E:\\我的项目";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.evaluate(() => {
    [...document.querySelectorAll(".proj-path-edit button")].find((b) => b.textContent.trim() === "保存").click();
  });
  await sleep(900);
  const openRes = await page.evaluate(async () => {
    const resp = await fetch("/api/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "E:\\我的项目" }),
    });
    return resp.json();
  });
  check("真实路径打开文件夹返回成功", openRes.ok === true && openRes.path === "E:\\我的项目", JSON.stringify(openRes));

  await page.screenshot({ path: "_verify/proj-path-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

await api("deleteProject", { id: pid });
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
