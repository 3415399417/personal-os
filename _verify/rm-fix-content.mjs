import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:E:/我的项目/personal-os/dev.db' });
db.execute("UPDATE Reminder SET content = '' WHERE content = '系统提醒'");
const r = db.execute("SELECT id, title, content FROM Reminder");
console.log('reminders now:', JSON.stringify(r.rows));
