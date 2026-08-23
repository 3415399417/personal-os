const BASE = "http://localhost:3000";
const api = (action, payload) =>
  fetch(`${BASE}/api/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).then((r) => r.json());

let total = 0;
for (let round = 0; round < 5; round++) {
  const todos = await api("getTodos", null);
  const testTodos = todos.filter((t) => t.text.startsWith("折叠任务"));
  if (testTodos.length === 0) break;
  for (const t of testTodos) {
    await api("deleteTodo", { id: t.id });
    total++;
  }
  console.log(`round ${round + 1}: deleted ${testTodos.length}`);
}
console.log("total deleted:", total);
const remaining = await api("getTodos", null);
console.log("remaining todos:", remaining.map((t) => t.text).join(", "));
