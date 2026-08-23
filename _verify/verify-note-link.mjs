// 验证关联笔记：A) 笔记页新建时选项目 B) 详情页直接新建
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

// 准备测试项目
const proj = await api("createProject", { name: "关联测试项目", status: "active" });
const pid = proj.id;
console.log("test project:", pid);

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* ── 场景 A：笔记页新建，选关联项目 ── */
  await page.goto(`${BASE}/notes`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("新建笔记")).click();
  });
  await sleep(400);
  await page.type("#nn-title", "A场景关联笔记");
  await page.type("#nn-content", "来自笔记页的关联测试");
  // 选择关联项目
  const selected = await page.evaluate((pname) => {
    const sel = document.querySelector("#nn-project");
    const opt = [...sel.options].find((o) => o.textContent === pname);
    if (!opt) return false;
    sel.value = opt.value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, "关联测试项目");
  check("笔记页弹窗有「关联项目」下拉且可选中测试项目", selected);
  await sleep(200);
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "保存").click();
  });
  await sleep(900);
  const noteListed = await page.evaluate(() => document.body.textContent.includes("A场景关联笔记"));
  check("笔记页保存成功，列表出现该笔记", noteListed);

  // 详情页应显示关联笔记
  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);
  const shownInDetail = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    return panel ? panel.textContent.includes("A场景关联笔记") : false;
  });
  check("详情页「项目笔记」显示来自笔记页的关联笔记", shownInDetail);

  /* ── 场景 B：详情页直接新建关联笔记 ── */
  await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const btn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("新建笔记"));
    btn.click();
  });
  await sleep(400);
  await page.type("#pn-title", "B场景项目内笔记");
  await page.type("#pn-content", "在项目详情页里直接写的笔记");
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "保存").click();
  });
  await sleep(900);
  const bothShown = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const txt = panel ? panel.textContent : "";
    return txt.includes("A场景关联笔记") && txt.includes("B场景项目内笔记");
  });
  check("详情页两条关联笔记都显示", bothShown);

  // API 确认 projectId 正确写入
  const notes = await api("getNotes", null);
  const a = notes.find((n) => n.title === "A场景关联笔记");
  const b = notes.find((n) => n.title === "B场景项目内笔记");
  check("A 笔记 projectId 指向测试项目", a?.projectId === pid, `projectId=${a?.projectId}`);
  check("B 笔记 projectId 指向测试项目", b?.projectId === pid, `projectId=${b?.projectId}`);

  /* ── 截图留档 ── */
  await page.screenshot({ path: "_verify/note-link-final.png" });
} catch (e) {
  check("脚本执行", false, e.message);
  failures++;
} finally {
  await browser.close();
}

/* 清理测试数据 */
await api("deleteProject", { id: pid });
for (const t of ["A场景关联笔记", "B场景项目内笔记"]) {
  const notes = await api("getNotes", null);
  const n = notes.find((x) => x.title === t);
  if (n) await api("deleteNote", { id: n.id });
}
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
