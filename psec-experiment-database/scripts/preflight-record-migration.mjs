import mysql from 'mysql2/promise';
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [experiments] = await connection.query('SELECT id, slug, title, discipline, category, theoreticalBasis, historicalBackground, hypothesis, `procedure`, author, status, createdAt, updatedAt FROM experiments ORDER BY id');
const [submissions] = await connection.query('SELECT id, memberName, memberId, discipline, title, theoreticalBasis, historicalBackground, hypothesis, `procedure`, materials, expectedOutput, attachmentName, attachmentKey, attachmentUrl, status, publishedDiscipline, publishedCategory, rejectionComment, reviewedAt, reviewedBy, submittedAt, updatedAt FROM submissions ORDER BY id');
const [histories] = await connection.query('SELECT id, submissionId, action, editor, note, snapshotJson, createdAt FROM submissionHistory ORDER BY submissionId, createdAt, id');
const historyCounts = Object.fromEntries(submissions.map((row) => [row.id, histories.filter((history) => Number(history.submissionId) === Number(row.id)).length]));
const matchedPairs = experiments.map((experiment) => {
  const match = /^submission-(\d+)$/.exec(experiment.slug);
  const submission = match ? submissions.find((row) => Number(row.id) === Number(match[1])) : null;
  return submission ? { experimentId: experiment.id, experimentSlug: experiment.slug, submissionId: submission.id, experimentTitle: experiment.title, submissionTitle: submission.title, historyCount: historyCounts[submission.id] } : null;
}).filter(Boolean);
console.log(JSON.stringify({
  experiments: experiments.map(({ id, slug, title, category }) => ({ id, slug, title, category })),
  submissions: submissions.map(({ id, title, status, publishedCategory }) => ({ id, title, status, publishedCategory, historyCount: historyCounts[id] })),
  matchedPairs,
  historyTotal: histories.length,
  historyCounts,
  legacyAttachmentCount: submissions.filter((row) => row.attachmentKey).length,
}, null, 2));
await connection.end();
