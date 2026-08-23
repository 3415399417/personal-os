import { createClient } from "@libsql/client";
import fs from "fs";

const dbPath = "E:/我的项目/personal-os/dev.db";
const client = createClient({ url: `file:${dbPath}` });

async function main() {
  // 查当前焦点标记
  const proj = await client.execute(`SELECT id, name, isTodayFocus FROM Project WHERE isTodayFocus = 1`);
  const task = await client.execute(`SELECT id, title, isTodayFocus FROM Task WHERE isTodayFocus = 1`);
  console.log("FOCUS_PROJECT:", JSON.stringify(proj.rows));
  console.log("FOCUS_TASK:", JSON.stringify(task.rows));

  const mode = process.argv[2]; // "off" | "on"
  if (mode === "off") {
    await client.execute(`UPDATE Project SET isTodayFocus = 0 WHERE isTodayFocus = 1`);
    await client.execute(`UPDATE Task SET isTodayFocus = 0 WHERE isTodayFocus = 1`);
    console.log("FOCUS OFF");
  } else if (mode === "on") {
    // 恢复：从备份文件读回 id（如果有）
    if (fs.existsSync("E:/我的项目/personal-os/_verify/focus-backup.json")) {
      const backup = JSON.parse(fs.readFileSync("E:/我的项目/personal-os/_verify/focus-backup.json", "utf8"));
      for (const p of backup.projects) {
        await client.execute({ sql: `UPDATE Project SET isTodayFocus = 1 WHERE id = ?`, args: [p] });
      }
      for (const t of backup.tasks) {
        await client.execute({ sql: `UPDATE Task SET isTodayFocus = 1 WHERE id = ?`, args: [t] });
      }
      console.log("FOCUS RESTORED from backup");
    } else {
      console.log("NO BACKUP FILE");
    }
  } else if (mode === "backup") {
    fs.writeFileSync(
      "E:/我的项目/personal-os/_verify/focus-backup.json",
      JSON.stringify({
        projects: proj.rows.map((r) => r.id),
        tasks: task.rows.map((r) => r.id),
      }),
      "utf8"
    );
    console.log("BACKUP SAVED");
  }
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
