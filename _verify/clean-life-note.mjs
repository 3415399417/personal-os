import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });
const del = await client.execute("DELETE FROM Note WHERE title = '2026-08-22'");
const r = await client.execute("SELECT COUNT(*) AS n FROM Note WHERE title = '2026-08-22'");
console.log("cleaned rows:", del.rowsAffected, "left:", r.rows[0].n);
await client.close();
