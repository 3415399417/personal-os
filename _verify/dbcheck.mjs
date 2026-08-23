import { createClient } from '@libsql/client';
const db = createClient({ url: 'file:E:/我的项目/personal-os/dev.db' });
const r = db.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log(JSON.stringify(r, null, 2));
