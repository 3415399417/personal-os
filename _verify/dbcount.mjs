import { PrismaClient } from '../lib/generated/prisma/client.ts';
import { PrismaLibSql } from '@prisma/adapter-libsql';
const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });
const models = ['project','task','note','resource','reminder','learningRecord','asset','review','aiConversation','aiMessage'];
for (const m of models) {
  try {
    const c = await prisma[m].count();
    console.log(m + ' = ' + c);
  } catch (e) { console.log(m + ' ERR ' + e.message); }
}
await prisma.$disconnect();
