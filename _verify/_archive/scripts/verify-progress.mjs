// 进度条功能验收：/today 总进度 + 分组进度 + 侧边栏待办进度 + 刷新持久化
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

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // ── 1. 空库：今日 0/0，进度条 0%，不报错 ──
  await page.goto(`${BASE}/today`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(900);
  const emptyState = await page.evaluate(() => {
    const label = document.querySelector("[data-od-id='today-total-progress'] .progress-label")?.textContent ?? "";
    const width = document.querySelector("[data-od-id='today-total-progress'] .progress i")?.style.width ?? "";
    const appErr = document.body.textContent.includes("Application error");
    return { label, width, appErr };
  });
  check("空库今日 0/0 · 0%", emptyState.label.includes("0/0") && emptyState.label.includes("0%"), emptyState.label);
  check("空库进度条宽度 0", emptyState.width === "0%", emptyState.width);
  check("空库无报错", !emptyState.appErr);

  // ── 2. 添加任务：must 组 +2，doing 组 +1 ──
  const addTask = async (groupIdx, title) => {
    await page.evaluate((idx) => {
      const groups = [...document.querySelectorAll(".task-group")];
      groups[idx]?.querySelector(".btn-add")?.click();
    }, groupIdx);
    await sleep(250);
    await page.type('input[placeholder="输入任务，回车添加"]', title);
    await page.keyboard.press("Enter");
    await sleep(700);
  };
  await addTask(0, "任务甲"); // must
  await addTask(0, "任务乙"); // must
  await addTask(1, "任务丙"); // doing
  const afterAdd = await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups[0];
    const doing = groups[1];
    return {
      total: document.querySelector("[data-od-id='today-total-progress'] .progress-label")?.textContent ?? "",
      mustCount: must?.querySelector(".task-group-count")?.textContent ?? "",
      doingCount: doing?.querySelector(".task-group-count")?.textContent ?? "",
      mustBar: must?.querySelector(".progress i")?.style.width ?? "",
    };
  });
  check("添加后总进度 0/3", afterAdd.total.includes("0/3"), afterAdd.total);
  check("must 组 0/2", afterAdd.mustCount === "0/2", afterAdd.mustCount);
  check("doing 组 0/1", afterAdd.doingCount === "0/1", afterAdd.doingCount);
  check("must 组进度条 0%", afterAdd.mustBar === "0%", afterAdd.mustBar);

  // ── 3. 勾选 must 组"任务甲" → 总进度 1/3·33%，must 组 1/2·50% ──
  await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups[0];
    const item = [...must.querySelectorAll(".task-item")].find((b) => b.textContent.includes("任务甲"));
    item?.click();
  });
  await sleep(800);
  const afterToggle = await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups[0];
    return {
      total: document.querySelector("[data-od-id='today-total-progress'] .progress-label")?.textContent ?? "",
      totalBar: document.querySelector("[data-od-id='today-total-progress'] .progress i")?.style.width ?? "",
      mustCount: must?.querySelector(".task-group-count")?.textContent ?? "",
      mustBar: must?.querySelector(".progress i")?.style.width ?? "",
      taskClass: [...must.querySelectorAll(".task-item")].find((b) => b.textContent.includes("任务甲"))?.className ?? "",
    };
  });
  check("勾选后总进度 1/3 · 33%", afterToggle.total.includes("1/3") && afterToggle.total.includes("33%"), afterToggle.total);
  check("总进度条 33%", afterToggle.totalBar === "33%", afterToggle.totalBar);
  check("must 组 1/2", afterToggle.mustCount === "1/2", afterToggle.mustCount);
  check("must 组进度条 50%", afterToggle.mustBar === "50%", afterToggle.mustBar);
  check("任务甲留在原组（划线 done）", afterToggle.taskClass.includes("done"), afterToggle.taskClass);

  // ── 4. 取消勾选 → 回到 0/3 · 0% ──
  await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups[0];
    const item = [...must.querySelectorAll(".task-item")].find((b) => b.textContent.includes("任务甲"));
    item?.click();
  });
  await sleep(800);
  const afterUntoggle = await page.evaluate(() => ({
    total: document.querySelector("[data-od-id='today-total-progress'] .progress-label")?.textContent ?? "",
    mustCount: document.querySelectorAll(".task-group")[0]?.querySelector(".task-group-count")?.textContent ?? "",
  }));
  check("取消后回到 0/3", afterUntoggle.total.includes("0/3") && afterUntoggle.mustCount === "0/2", `${afterUntoggle.total} / ${afterUntoggle.mustCount}`);

  // ── 5. 侧边栏待办进度（待办 = 全部任务，含已完成） ──
  // 先勾选一个任务使其 done，再看侧边栏
  await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups[0];
    const item = [...must.querySelectorAll(".task-item")].find((b) => b.textContent.includes("任务乙"));
    item?.click();
  });
  await sleep(800);
  const sidebar = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".side-todos .todo-item")];
    const meta = document.querySelector(".side-todos .progress-meta");
    const bar = document.querySelector(".side-todos .progress i");
    return {
      doneTexts: items.filter((i) => i.classList.contains("done")).map((i) => i.textContent),
      meta: meta?.textContent ?? "",
      barW: bar?.style.width ?? "",
    };
  });
  check("侧边栏待办进度显示 1/3", sidebar.meta.includes("1/3"), sidebar.meta);
  check("侧边栏待办进度条 33%", sidebar.barW === "33%", sidebar.barW);
  check("已完成待办划线显示", sidebar.doneTexts.some((t) => t.includes("任务乙")), sidebar.doneTexts.join(","));

  // ── 6. 刷新后进度保留（数据库持久化） ──
  await page.reload({ waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1000);
  const afterReload = await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".task-group")];
    const must = groups[0];
    return {
      total: document.querySelector("[data-od-id='today-total-progress'] .progress-label")?.textContent ?? "",
      mustCount: must?.querySelector(".task-group-count")?.textContent ?? "",
      doneInMust: [...must.querySelectorAll(".task-item.done")].length,
    };
  });
  check("刷新后进度保留（1/3 · 33%）", afterReload.total.includes("1/3") && afterReload.total.includes("33%"), afterReload.total);
  check("刷新后 must 组 1/2 且划线保留", afterReload.mustCount === "1/2" && afterReload.doneInMust === 1, JSON.stringify(afterReload));

  // ── 7. 清理测试数据 ──
  const clean = await page.evaluate(async () => {
    const call = async (action, payload) => {
      const r = await fetch("/api/data", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      return r.json();
    };
    const tasks = await call("getTodayTasks");
    for (const t of tasks.filter((x) => ["任务甲", "任务乙", "任务丙"].includes(x.text))) {
      await call("deleteTask", { id: t.id });
    }
    return "ok";
  });
  check("清理测试数据", clean === "ok");

  await page.close();
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nALL PROGRESS CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
