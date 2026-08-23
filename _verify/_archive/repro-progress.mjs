// 复现：项目任务勾选完成后，进度是否更新
const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

// 1. 建项目 + 2 任务
const proj = await api("createProject", { name: "进度复现项目", status: "active" });
const t1 = await api("createTask", { title: "任务1", group: "must", projectId: proj.id });
const t2 = await api("createTask", { title: "任务2", group: "doing", projectId: proj.id });
console.log("after create:", (await api("getProject", { id: proj.id })).progress);

// 2. 勾选任务1 完成
await api("toggleTask", { id: t1.id, done: true });
const p1 = await api("getProject", { id: proj.id });
console.log("after toggle t1:", p1.progress, "status:", JSON.stringify(p1.tasks.map((t) => ({ t: t.text, done: t.done, group: t.group }))));

// 3. dashboard 进度
const dash = await api("getDashboard", null);
const dp = dash.projects.find((p) => p.id === proj.id);
console.log("dashboard progress:", dp?.progress);

// 4. 勾选任务2
await api("toggleTask", { id: t2.id, done: true });
const p2 = await api("getProject", { id: proj.id });
console.log("after toggle t2:", p2.progress);

// 清理
await api("deleteProject", { id: proj.id });
