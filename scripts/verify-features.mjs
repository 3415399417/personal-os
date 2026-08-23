// 功能验收（空库适配版）：各页面交互真实生效并写入 SQLite
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(existsSync);
const BASE = (process.env.APP_URL ?? "http://localhost:3000/").replace(/\/$/, "");

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " → " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  /* ── /today 空状态 + 新建 + 勾选 ── */
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  const emptyShown = await page.evaluate(() => document.querySelectorAll(".task-group .task-empty").length === 4);
  check("today 空库四组空状态", emptyShown);
  // 在"必须完成"组新建任务
  await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups.find((g) => g.querySelector(".task-group-title")?.textContent?.includes("必须完成"));
    must?.querySelector(".btn-add")?.click();
  });
  await sleep(300);
  await page.type('input[placeholder="输入任务，回车添加"]', "功能验收任务");
  await page.keyboard.press("Enter");
  await sleep(700);
  const added = await page.evaluate(() =>
    [...document.querySelectorAll(".task-item")].some((b) => b.getAttribute("aria-label")?.includes("功能验收任务")),
  );
  check("today 新建任务入库", added);
  // 勾选 → 留在原组划线（完成不移组）
  const taskBtn = await page.evaluateHandle(() => {
    const items = [...document.querySelectorAll(".task-item")];
    return items.find((b) => b.getAttribute("aria-label")?.includes("功能验收任务"));
  });
  const t1 = taskBtn.asElement();
  await t1.click();
  await sleep(700);
  const doneInGroup = await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups.find((g) => g.querySelector(".task-group-title")?.textContent?.includes("必须完成"));
    const item = [...must.querySelectorAll(".task-item")].find((b) => b.getAttribute("aria-label")?.includes("功能验收任务"));
    return item ? item.classList.contains("done") : false;
  });
  check("勾选后留组划线完成", doneInGroup);

  /* ── /projects 新建弹窗 + 空状态清除 ── */
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  await page.click(".btn-primary");
  await sleep(300);
  const modalShown = await page.evaluate(() => !!document.querySelector(".modal"));
  check("projects 新建弹窗出现", modalShown);
  await page.type("#np-name", "功能验收项目");
  await page.click(".modal-foot .btn-primary");
  await sleep(800);
  const projAdded = await page.evaluate(() =>
    [...document.querySelectorAll(".mini-card-title")].some((el) => el.textContent === "功能验收项目"),
  );
  check("projects 新建项目入库", projAdded);

  /* ── /notes 空状态 + 新建 + 筛选 ── */
  await page.goto(`${BASE}/notes`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  const notesEmpty = await page.evaluate(() => !!document.querySelector(".empty-state"));
  check("notes 空库空状态", notesEmpty);
  await page.click(".btn-primary");
  await sleep(300);
  await page.type("#nn-title", "功能验收笔记");
  await page.type("#nn-content", "# 测试内容");
  await page.click(".modal-foot .btn-primary");
  await sleep(800);
  const noteAdded = await page.evaluate(() =>
    [...document.querySelectorAll(".mini-card-title")].some((el) => el.textContent === "功能验收笔记"),
  );
  check("notes 新建笔记入库", noteAdded);

  /* ── /assets 空状态 + 新建 + 筛选 ── */
  await page.goto(`${BASE}/assets`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  const assetsEmpty = await page.evaluate(() => !!document.querySelector(".empty-state"));
  check("assets 空库空状态", assetsEmpty);
  await page.click(".btn-primary");
  await sleep(300);
  await page.type("#na-title", "功能验收资产");
  await page.type("#na-summary", "测试摘要");
  await page.click(".modal-foot .btn-primary");
  await sleep(800);
  const assetAdded = await page.evaluate(() =>
    [...document.querySelectorAll(".mini-card-title")].some((el) => el.textContent === "功能验收资产"),
  );
  check("assets 新建资产入库", assetAdded);

  /* ── /review 空状态 + 新建 ── */
  await page.goto(`${BASE}/review`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  const reviewEmpty = await page.evaluate(() => !!document.querySelector(".empty-state"));
  check("review 空库空状态", reviewEmpty);
  await page.click(".btn-primary");
  await sleep(300);
  await page.type("#rv-summary", "功能验收总结内容");
  await page.click(".modal-foot .btn-primary");
  await sleep(800);
  const rvAdded = await page.evaluate(() =>
    [...document.querySelectorAll(".mini-card-desc")].some((el) => el.textContent?.includes("功能验收总结内容")),
  );
  check("review 新建复盘入库", rvAdded);

  /* ── /inbox 空状态 + 新建 + 标记已处理 ── */
  await page.goto(`${BASE}/inbox`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  const inboxEmpty = await page.evaluate(() => !!document.querySelector(".empty-state"));
  check("inbox 空库空状态", inboxEmpty);
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("main .btn-add, .empty-state .btn")];
    btns.find((b) => b.textContent?.includes("收集一条"))?.click();
  });
  await sleep(300);
  await page.type('input[placeholder="输入内容，回车加入收集箱"]', "功能验收条目");
  await page.keyboard.press("Enter");
  await sleep(800);
  const ibAdded = await page.evaluate(() =>
    [...document.querySelectorAll(".list-item-title")].some((el) => el.textContent === "功能验收条目"),
  );
  check("inbox 新建条目入库", ibAdded);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".list-item .btn-soft")].find((b) => b.textContent?.includes("标记已处理"));
    btn?.click();
  });
  await sleep(700);
  const handledNow = await page.evaluate(() =>
    [...document.querySelectorAll(".list-item")].some((i) => i.querySelector(".badge.done")?.textContent === "已处理"),
  );
  check("inbox 标记已处理入库", handledNow);

  /* ── /learning 空状态 + 新建 ── */
  await page.goto(`${BASE}/learning`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  const learnEmpty = await page.evaluate(() => !!document.querySelector(".empty-state"));
  check("learning 空库空状态", learnEmpty);
  await page.click(".btn-primary");
  await sleep(300);
  await page.type("#lr-title", "功能验收计划");
  await page.click(".modal-foot .btn-primary");
  await sleep(800);
  const lrAdded = await page.evaluate(() =>
    [...document.querySelectorAll(".list-item-title")].some((el) => el.textContent === "功能验收计划"),
  );
  check("learning 新建计划入库", lrAdded);

  /* ── /ai 空状态 + 快捷提问（真实 API） ── */
  await page.goto(`${BASE}/ai`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const aiEmpty = await page.evaluate(() => !!document.querySelector(".empty-state"));
  check("ai 空库空状态", aiEmpty);
  await page.click(".ai-tag");
  let aiReplied = false;
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    aiReplied = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".chat-row.assistant")].filter((r) => !r.textContent.includes("正在思考"));
      return rows.length >= 1;
    });
    if (aiReplied) break;
  }
  check("ai 真实回复", aiReplied);

  /* ── /settings 开关 ── */
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(700);
  const swBefore = await page.evaluate(() => document.querySelector(".switch")?.classList.contains("on"));
  await page.click(".switch");
  await sleep(200);
  const swAfter = await page.evaluate(() => document.querySelector(".switch")?.classList.contains("on"));
  check("settings 开关切换", swBefore !== swAfter, `${swBefore}→${swAfter}`);

  // 清理功能验收数据
  const clean = await page.evaluate(async () => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const tasks = await call("getTodayTasks");
    for (const t of tasks.filter((x) => x.text.includes("功能验收任务"))) await call("deleteTask", { id: t.id });
    const projects = await call("getProjects");
    for (const p of projects.filter((x) => x.name.includes("功能验收项目"))) {
      for (const t of p.tasks) await call("deleteTask", { id: t.id });
      await call("deleteProject", { id: p.id });
    }
    const notes = await call("getNotes");
    for (const n of notes.filter((x) => x.title.includes("功能验收笔记"))) await call("deleteNote", { id: n.id });
    const assets = await call("getAssets");
    for (const a of assets.filter((x) => x.title.includes("功能验收资产"))) await call("deleteAsset", { id: a.id });
    const reviews = await call("getReviews");
    for (const r of reviews.filter((x) => x.summary.includes("功能验收总结"))) await call("deleteReview", { id: r.id });
    const inbox = await call("getInboxItems");
    for (const i of inbox.filter((x) => x.text.includes("功能验收条目"))) await call("deleteInboxItem", { id: i.id });
    const learn = await call("getLearningRecords");
    for (const l of learn.filter((x) => x.title.includes("功能验收计划"))) await call("deleteLearningRecord", { id: l.id });
    await call("clearConversation");
    return "ok";
  });
  check("清理测试数据", clean === "ok");

  await page.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL FEATURES PASS (EMPTY DB)" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
