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
  // 找所有"项目档案"笔记，按 (projectId, title) 分组，每组保留最早一篇，删其余
  const notes = await call("getNotes");
  const archives = notes.filter((n) => n.title.includes("项目档案") && n.projectId);
  console.log("档案笔记总数:", archives.length);

  const groups = new Map();
  for (const n of archives) {
    const key = n.projectId + "|" + n.title;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  let deleted = 0;
  for (const [key, list] of groups) {
    if (list.length <= 1) continue;
    // 按 time 排序（时间字符串格式一致可比较），保留最早
    const sorted = [...list].sort((a, b) => (a.time < b.time ? -1 : 1));
    for (const dup of sorted.slice(1)) {
      await call("deleteNote", { id: dup.id }).catch(() => {});
      console.log("删除重复:", dup.title, "@", dup.time, dup.id);
      deleted++;
    }
  }
  console.log("共删除重复档案:", deleted);
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
