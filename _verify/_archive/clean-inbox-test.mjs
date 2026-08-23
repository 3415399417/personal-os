import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });
await client.execute({ sql: "DELETE FROM Task WHERE title = ?", args: ["下周要给客户演示外贸AI系统，记得准备演示环境和话术"] });
await client.execute({ sql: "DELETE FROM Resource WHERE name = ?", args: ["下周要给客户演示外贸AI系统，记得准备演示环境和话术"] });
const t = await client.execute("SELECT COUNT(*) AS n FROM Task");
const r = await client.execute("SELECT COUNT(*) AS n FROM Resource");
console.log("cleaned, tasks:", t.rows[0].n, "resources:", r.rows[0].n);
await client.close();
