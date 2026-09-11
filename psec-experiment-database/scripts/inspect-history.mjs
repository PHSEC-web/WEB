import mysql from 'mysql2/promise';
const db = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await db.query('SELECT submissionId, action, editor, note, snapshotJson, createdAt FROM submissionHistory ORDER BY submissionId, createdAt, id');
console.log(JSON.stringify(rows.map((row) => ({ ...row, snapshotJson: JSON.parse(row.snapshotJson) })), null, 2));
await db.end();
