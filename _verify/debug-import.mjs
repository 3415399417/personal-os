const API = "http://localhost:3000/api/data";
async function call(action, payload) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const txt = await r.text();
  console.log(action, "HTTP", r.status, "→", txt.slice(0, 400));
  try { return JSON.parse(txt); } catch { return txt; }
}

(async () => {
  const projs = await call("getProjects");
  console.log("\n库中项目名:", JSON.stringify(projs.map((p) => ({ name: p.name, folderPath: p.folderPath }))));
  const dirs = await call("scanProjectsDir");
  console.log("\n扫描目录数:", dirs.length);
})().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
