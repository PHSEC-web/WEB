import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);
const [experiments] = await db.query('SELECT id, slug, title, discipline, category, author, status FROM experiments ORDER BY id');
const [submissions] = await db.query('SELECT id, memberName, memberId, title, discipline, status, publishedDiscipline, publishedCategory, attachmentKey FROM submissions ORDER BY id');
console.log(JSON.stringify({ experiments, submissions }, null, 2));
await db.end();
