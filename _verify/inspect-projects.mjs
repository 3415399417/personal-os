const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

const dash = await api("getDashboard", null);
for (const p of dash.projects) {
  const detail = await api("getProject", { id: p.id });
  console.log(`项目「${p.name}」 progress=${detail.progress} 任务数=${detail.tasks.length}`);
  for (const t of detail.tasks) {
    console.log(`  - ${t.text} done=${t.done} group=${t.group}`);
  }
}
