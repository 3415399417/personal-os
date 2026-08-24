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
  const projs = await call("getProjects");
  const ppt = projs.find((p) => p.name.includes("AI-PPT"));
  const notes = await call("getNotes");
  const archives = notes.filter((n) => n.projectId === ppt.id);
  console.log(JSON.stringify(archives.map((n) => ({ id: n.id, title: n.title, type: n.type, time: n.time, head: n.content.slice(0, 40) })), null, 2));
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
