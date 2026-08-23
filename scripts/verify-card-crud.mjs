// 首页三卡（当前项目/最近沉淀/资源中心）新建+删除验收
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find(existsSync);
const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " → " + detail : ""}`);
};

async function realClick(page, selector) {
  const r = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, selector);
  if (!r) return false;
  await page.mouse.move(r.x, r.y);
  await sleep(150);
  await page.mouse.click(r.x, r.y);
  return true;
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 清库
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(500);
  await page.evaluate(async () => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const tasks = await call("getTodayTasks");
    for (const t of tasks) await call("deleteTask", { id: t.id });
    const projects = await call("getProjects");
    for (const p of projects) {
      const d = await call("getProject", { id: p.id });
      for (const t of d.tasks) await call("deleteTask", { id: t.id });
      await call("deleteProject", { id: p.id });
    }
    const notes = await call("getNotes");
    for (const n of notes) await call("deleteNote", { id: n.id });
    const inbox = await call("getInboxItems");
    for (const i of inbox) await call("deleteInboxItem", { id: i.id });
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);

  /* ── 1. 当前项目卡：新建 → 出现 ── */
  await realClick(page, '[data-od-id="card-projects"] .btn-add');
  await sleep(400);
  await page.type("#hp-name", "卡片项目甲");
  await page.type("#hp-desc", "从首页卡片新建");
  await realClick(page, ".modal-foot .btn-primary");
  await sleep(1000);
  const projShown = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    return card?.textContent?.includes("卡片项目甲") ?? false;
  });
  check("项目卡新建项目出现", projShown);

  /* ── 2. 项目卡：hover 删除 → 确认 → 消失 ── */
  const delBtn = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    const li = [...card.querySelectorAll(".proj-list li")].find((x) => x.textContent.includes("卡片项目甲"));
    const btn = li?.querySelector("button.task-del");
    const r = btn?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  if (delBtn) {
    await page.mouse.move(delBtn.x, delBtn.y);
    await sleep(300);
    const delVisible = await page.evaluate(() => {
      const card = document.querySelector('[data-od-id="card-projects"]');
      const li = [...card.querySelectorAll(".proj-list li")].find((x) => x.textContent.includes("卡片项目甲"));
      const btn = li?.querySelector("button.task-del");
      return btn ? getComputedStyle(btn).opacity : "none";
    });
    check("项目卡 hover 显示删除按钮", delVisible === "1", `opacity=${delVisible}`);
    await page.mouse.click(delBtn.x, delBtn.y);
    await sleep(500);
    // 确认弹窗
    const confirmShown = await page.evaluate(() => document.body.textContent.includes("确认删除项目"));
    check("删除项目确认弹窗", confirmShown);
    await realClick(page, ".modal-foot .btn-primary");
    await sleep(1000);
  }
  const projGone = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-projects"]');
    return !(card?.textContent?.includes("卡片项目甲") ?? false);
  });
  check("项目卡删除后消失", projGone);

  /* ── 3. 最近沉淀卡：新建 → 出现 ── */
  await realClick(page, '[data-od-id="card-notes"] .btn-add');
  await sleep(400);
  await page.type("#hn-title", "卡片笔记甲");
  await page.type("#hn-content", "# 从首页新建的笔记");
  await realClick(page, ".modal-foot .btn-primary");
  await sleep(1000);
  const noteShown = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    return card?.textContent?.includes("卡片笔记甲") ?? false;
  });
  check("沉淀卡新建笔记出现", noteShown);

  /* ── 4. 沉淀卡：hover 删除 → 消失 ── */
  const noteDel = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    const li = [...card.querySelectorAll(".note-item")].find((x) => x.textContent.includes("卡片笔记甲"));
    const btn = li?.querySelector("button.task-del");
    const r = btn?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  if (noteDel) {
    await page.mouse.click(noteDel.x, noteDel.y);
    await sleep(1000);
  }
  const noteGone = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-notes"]');
    return !(card?.textContent?.includes("卡片笔记甲") ?? false);
  });
  check("沉淀卡删除后消失", noteGone);

  /* ── 5. 资源中心卡：新建资源 → 计数+1 ── */
  const resCount0 = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-resources"]');
    const cell = [...card.querySelectorAll(".res-cell")].find((x) => x.textContent.includes("收集箱"));
    return Number(cell?.querySelector(".num")?.textContent ?? -1);
  });
  await realClick(page, '[data-od-id="card-resources"] .btn-add');
  await sleep(400);
  await page.type("#hr-name", "卡片资源甲");
  await realClick(page, ".modal-foot .btn-primary");
  await sleep(1000);
  const resCount1 = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-resources"]');
    const cell = [...card.querySelectorAll(".res-cell")].find((x) => x.textContent.includes("收集箱"));
    return Number(cell?.querySelector(".num")?.textContent ?? -1);
  });
  check("资源卡新建资源计数+1", resCount1 === resCount0 + 1, `${resCount0} → ${resCount1}`);

  /* ── 6. 资源中心卡：hover 删除最近一条 → 计数-1 ── */
  const resDel = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-resources"]');
    const cell = [...card.querySelectorAll(".res-cell")].find((x) => x.textContent.includes("收集箱"));
    const wrap = cell?.parentElement;
    const btn = wrap?.querySelector("button.task-del");
    const r = btn?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  });
  if (resDel) {
    await page.mouse.move(resDel.x, resDel.y);
    await sleep(300);
    await page.mouse.click(resDel.x, resDel.y);
    await sleep(1000);
  }
  const resCount2 = await page.evaluate(() => {
    const card = document.querySelector('[data-od-id="card-resources"]');
    const cell = [...card.querySelectorAll(".res-cell")].find((x) => x.textContent.includes("收集箱"));
    return Number(cell?.querySelector(".num")?.textContent ?? -1);
  });
  check("资源卡删除后计数-1", resCount2 === resCount1 - 1, `${resCount1} → ${resCount2}`);

  /* ── 7. 刷新持久化：三卡操作结果保留 ── */
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1200);
  const afterReload = await page.evaluate(() => {
    const proj = document.querySelector('[data-od-id="card-projects"]')?.textContent ?? "";
    const note = document.querySelector('[data-od-id="card-notes"]')?.textContent ?? "";
    return {
      projHas: proj.includes("卡片项目甲"),
      noteHas: note.includes("卡片笔记甲"),
    };
  });
  check("刷新后删除不复活（项目/笔记）", !afterReload.projHas && !afterReload.noteHas, JSON.stringify(afterReload));

  /* ── 清理（确保空库） ── */
  await page.evaluate(async () => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const inbox = await call("getInboxItems");
    for (const i of inbox) await call("deleteInboxItem", { id: i.id });
    const notes = await call("getNotes");
    for (const n of notes) await call("deleteNote", { id: n.id });
  });
  check("清理测试数据", true);

  await page.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL CARD CRUD CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
