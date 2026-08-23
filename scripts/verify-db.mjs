// 端到端 DB CRUD 验证（通过 /api/data）
const BASE = "http://localhost:3000/api/data";

async function call(action, payload) {
  const resp = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`${action}: ${data.error ?? resp.status}`);
  return data;
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " → " + detail : ""}`);
};

try {
  // 1. 空库
  let dash = await call("getDashboard");
  check("空库统计全 0", dash.stats.cells.every((c) => c.value === 0) && dash.projects.length === 0 && dash.execTotal === 0);

  // 2. 建项目
  const p1 = await call("createProject", { name: "验收项目", desc: "端到端测试", status: "active" });
  check("创建项目", !!p1.id && p1.name === "验收项目");
  const p1id = p1.id;

  // 3. 建 2 个任务
  const t1 = await call("createTask", { title: "任务A", group: "must", projectId: p1id });
  const t2 = await call("createTask", { title: "任务B", group: "doing", projectId: p1id });
  check("创建任务", !!t1.id && !!t2.id);

  // 4. 项目进度 = 0/2 = 0%
  let proj = await call("getProject", { id: p1id });
  check("任务 0/2 进度 0%", proj.progress === 0 && proj.tasks.length === 2, `progress=${proj.progress}`);

  // 5. 勾选任务A → 1/2 = 50%
  await call("toggleTask", { id: t1.id, done: true });
  proj = await call("getProject", { id: p1id });
  check("勾选后进度 50%", proj.progress === 50, `progress=${proj.progress}`);
  dash = await call("getDashboard");
  check("Dashboard 项目进度联动 50%", dash.projects.find((p) => p.id === p1id)?.progress === 50);

  // 6. 勾选任务B → 100%
  await call("toggleTask", { id: t2.id, done: true });
  proj = await call("getProject", { id: p1id });
  check("全部完成进度 100%", proj.progress === 100, `progress=${proj.progress}`);

  // 7. 取消勾选任务A → 1/2 = 50%（可逆）
  await call("toggleTask", { id: t1.id, done: false });
  proj = await call("getProject", { id: p1id });
  check("取消勾选回到 50%", proj.progress === 50, `progress=${proj.progress}`);

  // 8. 侧边栏待办（返回全部任务含已完成，done 标记真实）
  const todos = await call("getTodos", null);
  const todoA = todos.find((t) => t.id === t1.id);
  const todoB = todos.find((t) => t.id === t2.id);
  check("待办含未完成与已完成", !!todoA && todoA.done === false && !!todoB && todoB.done === true, `todos=${todos.length} a.done=${todoA?.done} b.done=${todoB?.done}`);

  // 9. 各资源 CRUD
  const note = await call("createNote", { title: "验收笔记", content: "# 内容", type: "灵感" });
  check("创建笔记", !!note.id);
  const asset = await call("createAsset", { title: "验收资产", content: "摘要", kind: "SOP" });
  check("创建资产", !!asset.id);
  const review = await call("createReview", { summary: "总结", wins: "亮点1\n亮点2", losses: "不足1", next: "下一步1", period: "2025年第35周" });
  check("创建复盘", !!review.id && review.wins.length === 2, `wins=${review.wins.length}`);
  const inbox = await call("createInboxItem", { text: "验收收集条目", source: "微信" });
  check("创建收集条目", !!inbox.id);
  await call("markInboxHandled", { id: inbox.id, handled: true });
  const inboxList = await call("getInboxItems", null);
  check("收集条目标记已处理", inboxList.find((i) => i.id === inbox.id)?.handled === true);
  const learn = await call("createLearningRecord", { title: "验收学习计划", progress: 40 });
  check("创建学习计划", !!learn.id);

  // 10. 再次读 Dashboard：统计联动
  dash = await call("getDashboard", null);
  check("Dashboard 项目数=1", dash.projects.length === 1);
  check("Dashboard 笔记数=1", dash.notes.length === 1);
  check("Dashboard 资产 SOP=1", dash.assets.find((a) => a.label === "SOP")?.count === 1);
  check("Dashboard 学习计划=1", dash.learning.planCount === 1);
  check("Dashboard 收集箱未处理=0", dash.resources.find((r) => r.label === "收集箱")?.count === 0);
  check("Dashboard 已完成=1(任务B)", dash.stats.cells.find((c) => c.label === "今日完成")?.value === 1);

  // 11. 持久化：模拟"刷新"（重新查询）
  const again = await call("getProject", { id: p1id });
  check("刷新后数据仍在", again.name === "验收项目" && again.tasks.length === 2 && again.progress === 50);

  // 12. AI 会话
  await call("saveAiExchange", { userText: "你好", assistantText: "你好！有什么可以帮你？" });
  const conv = await call("getConversation", null);
  check("AI 会话持久化", conv.length === 2 && conv[0].role === "user" && conv[1].role === "assistant", `msgs=${conv.length}`);

  // 13. 通知（无 reminder 数据 → 空）
  const notifs = await call("getNotifications", null);
  check("通知空（无提醒）", notifs.length === 0);

  // 清理验收数据（保持干净？保留项目以便用户查看；删除测试专用数据）
  await call("deleteTask", { id: t1.id });
  await call("deleteTask", { id: t2.id });
  await call("deleteProject", { id: p1id });
  await call("deleteNote", { id: note.id });
  await call("deleteAsset", { id: asset.id });
  await call("deleteReview", { id: review.id });
  await call("deleteInboxItem", { id: inbox.id });
  await call("deleteLearningRecord", { id: learn.id });
  await call("clearConversation", null);
  console.log("(测试数据已清理，数据库回到空库)");
} catch (e) {
  fail++;
  console.error("ERROR:", e.message);
}

console.log(`\n${fail === 0 ? "ALL DB CHECKS PASS" : `${fail} CHECK(S) FAILED`} (pass=${pass} fail=${fail})`);
process.exit(fail === 0 ? 0 : 1);
