// 验证：删除项目时任务级联删除，不残留进个人待办
const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -> " + detail : ""}`);
};

// 建项目 + 3 任务
const proj = await api("createProject", { name: "级联删除测试", status: "active" });
const pid = proj.id;
for (let i = 1; i <= 3; i++) {
  await api("createTask", { title: `级联测试任务${i}`, group: "must", projectId: pid });
}
const before = await api("getProject", { id: pid });
check("项目有 3 个任务", before.tasks.length === 3, `${before.tasks.length}`);

// 删除项目
await api("deleteProject", { id: pid });

// 项目应不存在
const dash = await api("getDashboard", null);
check("项目已删除", !dash.projects.some((p) => p.id === pid));

// 任务不应残留进个人待办
const todos = await api("getTodos", null);
const leaked = todos.filter((t) => t.text.startsWith("级联测试任务"));
check("任务未残留进个人待办", leaked.length === 0, `leaked=${leaked.length}`);
console.log("todos now:", todos.map((t) => t.text).join(", "));

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
