// 验证项目详情页：点击笔记查看 + 编辑保存
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

// 准备测试项目 + 关联笔记
const proj = await api("createProject", { name: "笔记编辑测试项目", status: "active" });
const pid = proj.id;
const note = await api("createNote", {
  title: "原始标题",
  content: "# 章节\n\n> 引用内容\n- 列表项\n正文段落",
  type: "灵感",
  projectId: pid,
});
const nid = note.id;
console.log("test project:", pid, "note:", nid);

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(`${BASE}/projects/${pid}`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);

  /* ── 1. 点击笔记 → 查看弹窗（Markdown 渲染） ── */
  await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    panel.querySelector(".note-item").click();
  });
  await sleep(500);
  const viewOk = await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.textContent.includes("原始标题"));
    if (!modal) return "no modal";
    const txt = modal.textContent;
    return txt.includes("章节") && txt.includes("引用内容") && txt.includes("列表项") && txt.includes("灵感") && txt.includes("编辑")
      ? "ok"
      : "content missing: " + txt.slice(0, 80);
  });
  check("点击笔记打开查看弹窗，Markdown 内容渲染", viewOk === "ok", viewOk);

  /* ── 2. 进入编辑模式，修改并保存 ── */
  await page.evaluate(() => {
    [...document.querySelectorAll(".modal button")].find((b) => b.textContent.includes("编辑")).click();
  });
  await sleep(400);
  await page.evaluate(() => {
    const modal = [...document.querySelectorAll(".modal")].find((m) => m.querySelector("#vn-title"));
    const title = modal.querySelector("#vn-title");
    title.value = "";
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.type("#vn-title", "修改后的标题");
  await page.evaluate(() => {
    const sel = document.querySelector("#vn-type");
    sel.value = "复盘";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  // 清空 textarea 填入新内容
  await page.evaluate(() => {
    const ta = document.querySelector("#vn-content");
    ta.value = "";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.type("#vn-content", "编辑后的正文内容");
  await sleep(200);
  await page.evaluate(() => {
    [...document.querySelectorAll(".modal button")].find((b) => b.textContent.trim() === "保存").click();
  });
  await sleep(900);

  // 列表应显示新标题
  const listUpdated = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".panel")].find((p) => p.textContent.includes("项目笔记"));
    const txt = panel ? panel.textContent : "";
    return txt.includes("修改后的标题") && !txt.includes("原始标题");
  });
  check("保存后列表显示新标题、旧标题消失", listUpdated);

  // API 确认数据库更新
  const notes = await api("getNotes", null);
  const updated = notes.find((n) => n.id === nid);
  check("数据库标题已更新", updated?.title === "修改后的标题", updated?.title);
  check("数据库类型已更新为复盘", updated?.type === "复盘", updated?.type);
  check("数据库内容已更新", updated?.content === "编辑后的正文内容", updated?.content);

  await page.screenshot({ path: "_verify/note-edit-final.png" });
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
