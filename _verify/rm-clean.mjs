import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:E:/我的项目/personal-os/dev.db' });
db.execute("DELETE FROM Reminder WHERE title IN ('状态测试','API测试提醒') OR title LIKE '[测试]%'");
const r = db.execute("SELECT id, title, status FROM Reminder");
console.log('remaining reminders:', JSON.stringify(r.rows));
