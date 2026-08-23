import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });
const r = await client.execute("SELECT id, title, type, content FROM Note ORDER BY createdAt DESC LIMIT 5");
console.log(JSON.stringify(r.rows, null, 1));
await client.close();
