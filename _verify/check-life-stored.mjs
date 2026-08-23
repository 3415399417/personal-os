import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });
const r = await client.execute({ sql: "SELECT title, type, content FROM Note WHERE title = ?", args: ["2026-08-22"] });
console.log("STORED:", JSON.stringify(r.rows));
await client.execute({ sql: "DELETE FROM Note WHERE title = ?", args: ["2026-08-22"] });
console.log("cleaned");
await client.close();
