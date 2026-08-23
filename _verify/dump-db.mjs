import { createClient } from "@libsql/client";

const client = createClient({ url: "file:E:/我的项目/personal-os/dev.db" });

async function main() {
  const tables = await client.execute(`SELECT name FROM sqlite_master WHERE type='table'`);
  console.log("TABLES:", tables.rows.map((r) => r.name).join(","));
  const proj = await client.execute(`SELECT id, name, status, isTodayFocus FROM Project`);
  console.log("PROJECTS:", JSON.stringify(proj.rows));
  const task = await client.execute(`SELECT id, title, status, isTodayFocus, projectId FROM Task LIMIT 20`);
  console.log("TASKS:", JSON.stringify(task.rows));
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
