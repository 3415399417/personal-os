// /api/chat function calling 端到端测试
const BASE = "http://localhost:3000/api/chat";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chat(messages, opts = {}) {
  const resp = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model: opts.model ?? "flash", effort: opts.effort ?? "low", pathname: opts.pathname ?? "/" }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${data.error}`);
  return data;
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " → " + detail : ""}`);
};

try {
  const toolsOf = (data) => (data.toolResults ?? []).map((t) => t.notice ?? t.name);

  // ── 1. 新建项目 ──
  console.log("\n── 1. 新建项目「AI验收项目」 ──");
  const r1 = await chat([{ role: "user", content: "新建一个项目叫 AI验收项目，描述：用于功能验收" }], { pathname: "/projects" });
  console.log("  reply:", (r1.content ?? "").replace(/\n/g, " ").slice(0, 80));
  console.log("  tools:", JSON.stringify(toolsOf(r1)));
  check("创建项目工具被调用", toolsOf(r1).some((t) => t.includes("已创建项目")), toolsOf(r1).join(";"));

  // ── 2. 列出所有项目 ──
  console.log("\n── 2. 列出所有项目 ──");
  const r2 = await chat([
    { role: "user", content: "新建一个项目叫 AI验收项目，描述：用于功能验收" },
    { role: "assistant", content: r1.content },
    { role: "user", content: "列出所有项目" },
  ], { pathname: "/projects" });
  console.log("  reply:", (r2.content ?? "").replace(/\n/g, " ").slice(0, 120));
  check("列出项目返回真实数据", r2.content?.includes("AI验收项目"), r2.content?.slice(0, 100));

  // ── 3. 连续操作：建任务 → 设今日最重要 → 标记完成 ──
  console.log("\n── 3. 建任务 → 设焦点 → 标记完成 ──");
  const r3 = await chat([{ role: "user", content: "新建任务「阅读30分钟」到 must 组，然后把它设为今日最重要，再标记完成" }], { pathname: "/today" });
  console.log("  reply:", (r3.content ?? "").replace(/\n/g, " ").slice(0, 120));
  console.log("  tools:", JSON.stringify(toolsOf(r3)));
  check("连续操作（建任务+设焦点+完成）",
    toolsOf(r3).some((t) => t.includes("已创建任务")) &&
    toolsOf(r3).some((t) => t.includes("今日最重要")) &&
    toolsOf(r3).some((t) => t.includes("完成任务")),
    toolsOf(r3).join(";"));

  // ── 4. 验证数据库真实变化 ──
  console.log("\n── 4. 验证 DB ──");
  const dash = await (await fetch("http://localhost:3000/api/data", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getDashboard" }),
  })).json();
  check("DB 项目存在", dash.projects.some((p) => p.name === "AI验收项目"));
  const today = await (await fetch("http://localhost:3000/api/data", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getTodayTasks" }),
  })).json();
  const readTask = today.find((t) => t.text.includes("阅读30分钟"));
  check("DB 任务存在且已完成", !!readTask && readTask.done === true, JSON.stringify(readTask));

  // ── 5. 删除确认流程（第一次请求应被拦截，要求确认） ──
  console.log("\n── 5. 删除项目（应要求确认） ──");
  const r5 = await chat([{ role: "user", content: "删除项目 AI验收项目" }], { pathname: "/projects" });
  console.log("  reply:", (r5.content ?? "").replace(/\n/g, " ").slice(0, 120));
  check("删除被要求确认", /确认|删除/.test(r5.content ?? "") && !(r5.content ?? "").includes("已删除"), r5.content?.slice(0, 100));
  // 确认后应真的删除
  console.log("\n── 5b. 用户确认后删除 ──");
  const r5b = await chat([
    { role: "user", content: "删除项目 AI验收项目" },
    { role: "assistant", content: r5.content },
    { role: "user", content: "确认" },
  ], { pathname: "/projects" });
  console.log("  reply:", (r5b.content ?? "").replace(/\n/g, " ").slice(0, 120));
  console.log("  tools:", JSON.stringify(toolsOf(r5b)));
  const dash2 = await (await fetch("http://localhost:3000/api/data", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getDashboard" }),
  })).json();
  check("确认后项目已删除", !dash2.projects.some((p) => p.name === "AI验收项目"));
  check("删除工具执行提示", toolsOf(r5b).some((t) => t.includes("已删除项目")), toolsOf(r5b).join(";"));

  // ── 6. 清理任务 ──
  if (readTask) {
    await fetch("http://localhost:3000/api/data", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteTask", payload: { id: readTask.id } }),
    });
  }
  console.log("\n清理完成");
} catch (e) {
  fail++;
  console.error("ERROR:", e.message);
}

console.log(`\n${fail === 0 ? "ALL FUNCTION-CALLING CHECKS PASS" : `${fail} CHECK(S) FAILED`} (pass=${pass} fail=${fail})`);
process.exit(fail === 0 ? 0 : 1);
