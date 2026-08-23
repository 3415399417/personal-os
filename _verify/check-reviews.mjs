import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });
const r = await client.execute("SELECT id, period, summary FROM Review ORDER BY createdAt DESC LIMIT 5");
console.log("REVIEWS:", JSON.stringify(r.rows.map((x) => ({ id: x.id, period: x.period, len: (x.summary || "").length, head: (x.summary || "").slice(0, 50) })), null, 1));
await client.close();
