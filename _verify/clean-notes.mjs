const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

const notes = await api("getNotes", null);
const testNotes = notes.filter((n) => n.title.startsWith("滚动笔记"));
for (const n of testNotes) {
  await api("deleteNote", { id: n.id });
}
console.log("deleted:", testNotes.length);
const remaining = await api("getNotes", null);
console.log("remaining:", remaining.map((n) => n.title).join(", "));
