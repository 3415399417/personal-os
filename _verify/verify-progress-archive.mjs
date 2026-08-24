const API = "http://localhost:3000/api/data";
async function call(action, payload) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  return r.json();
}
(async () => {
  // 1) 已完成项目进度
  const projs = await call("getProjects");
  const ppt = projs.find((p) => p.name.includes("AI-PPT"));
  console.log("AI-PPT生成器:", ppt ? JSON.stringify({ status: ppt.status, progress: ppt.progress, tasks: ppt.tasks.length }) : "未找到");
  const stats = await (await fetch("http://localhost:3000/api/stats")).json();
  const sProj = stats.projects.find((p) => p.name.includes("AI-PPT"));
  console.log("统计页:", sProj ? JSON.stringify(sProj) : "未找到");

  // 2) 档案去重：调两次
  if (ppt) {
    const r1 = await call("generateProjectArchive", { projectId: ppt.id });
    const r2 = await call("generateProjectArchive", { projectId: ppt.id });
    console.log("档案调用1:", JSON.stringify(r1));
    console.log("档案调用2(应 skipped):", JSON.stringify(r2));
    const notes = await call("getNotes");
    const archives = notes.filter((n) => n.title.includes("项目档案") && n.projectId === ppt.id);
    console.log("该项目的档案笔记数(应=1):", archives.length);
  }
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
