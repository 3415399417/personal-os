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
  // 导入 ai-chat（真实目录）→ 生成档案
  const imp = await call("importProjects", { inputs: [{ name: "ai-chat", folderPath: "E:\\我的项目\\ai-chat", status: "completed" }] });
  const proj = imp[0];
  console.log("imported:", proj.id, proj.name);

  const t0 = Date.now();
  const archive = await call("generateProjectArchive", { projectId: proj.id });
  console.log("archive in", ((Date.now() - t0) / 1000).toFixed(1) + "s:", JSON.stringify(archive));

  // 验证笔记已关联
  const notes = await call("getProjectResources", { projectId: proj.id }).catch(() => null);
  const projNotes = await (await fetch("http://localhost:3000/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "getProject", payload: { id: proj.id } }),
  })).json();
  console.log("project notes count:", projNotes?.notes?.length ?? "?");

  // 取笔记内容看质量
  const allNotes = await call("getNotes");
  const note = allNotes.find((n) => n.id === archive?.id);
  console.log("\n档案内容:\n" + (note?.content ?? "(未找到)"));

  // 清理
  await call("deleteProject", { id: proj.id });
  console.log("\ncleaned (项目+档案笔记已级联删除)");
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
