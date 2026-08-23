// 验证：首页最近沉淀无删除按钮 + /notes 查看弹窗删除（取消/确认）
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

const note = await api("createNote", { title: "[测试]笔记页删除", content: "x", type: "笔记" });
const nid = note.id;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* 1. 首页最近沉淀无删除按钮 */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const homeNoDel = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const delBtns = card.querySelectorAll(".task-del, .note-del");
    return delBtns.length === 0;
  });
  check("首页最近沉淀无删除按钮", homeNoDel);

  /* 2. /notes 打开笔记 → 弹窗有删除按钮 */
  await page.goto(`${BASE}/notes`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const cardFound = await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".mini-card")].find((b) => b.textContent.includes("[测试]笔记页删除"));
    if (!btn) return false;
    btn.click();
    return true;
  });
  check("笔记列表存在测试笔记并可点击打开", cardFound);
  await sleep(500);
  const hasDelBtn = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("[测试]笔记页删除"));
    return modal ? [...modal.querySelectorAll("button")].some((b) => b.textContent.includes("删除")) : false;
  });
  check("查看弹窗有「删除」按钮", hasDelBtn);

  /* 3. 点删除 → 出现确认；点取消 → 笔记还在 */
  await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("[测试]笔记页删除"));
    [...modal.querySelectorAll("button")].find((b) => b.textContent.trim() === "删除").click();
  });
  await sleep(400);
  const confirmShown = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("[测试]笔记页删除"));
    return modal ? modal.textContent.includes("不可恢复") && [...modal.querySelectorAll("button")].some((b) => b.textContent.includes("确认删除")) : false;
  });
  check("点删除后出现确认提示", confirmShown);
  await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("[测试]笔记页删除"));
    [...modal.querySelectorAll("button")].find((b) => b.textContent.trim() === "取消").click();
  });
  await sleep(400);
  const stillThere = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("[测试]笔记页删除"));
    return !!modal && !modal.textContent.includes("确认删除");
  });
  check("取消后弹窗回到查看态、笔记未删", stillThere);

  /* 4. 再删除并确认 → 弹窗关闭 + 列表刷新 + 数据库删除 */
  await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("[测试]笔记页删除"));
    [...modal.querySelectorAll("button")].find((b) => b.textContent.trim() === "删除").click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("[测试]笔记页删除"));
    [...modal.querySelectorAll("button")].find((b) => b.textContent.includes("确认删除")).click();
  });
  await sleep(900);
  const goneFromList = await page.evaluate(() => !document.body.textContent.includes("[测试]笔记页删除"));
  check("确认删除后列表不再显示", goneFromList);
  const notes = await api("getNotes", null);
  check("数据库已删除", !notes.some((n) => n.id === nid));

  await page.screenshot({ path: "_verify/notes-page-del-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
