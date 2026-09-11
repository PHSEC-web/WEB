import mysql from 'mysql2/promise';

const db = await mysql.createConnection(process.env.DATABASE_URL);
const [existing] = await db.query('SELECT COUNT(*) AS count FROM records');
if (Number(existing[0].count) !== 0) {
  throw new Error(`Refusing to migrate: records is not empty (${existing[0].count})`);
}

const [experiments] = await db.query('SELECT id, slug, discipline, title, category, theoreticalBasis, historicalBackground, hypothesis, `procedure`, author, status, createdAt, updatedAt FROM experiments ORDER BY id');
const [submissions] = await db.query('SELECT id, memberName, memberId, discipline, title, theoreticalBasis, historicalBackground, hypothesis, `procedure`, materials, expectedOutput, attachmentName, attachmentKey, attachmentUrl, status, publishedDiscipline, publishedCategory, rejectionComment, reviewedAt, reviewedBy, submittedAt, updatedAt FROM submissions ORDER BY id');
const [histories] = await db.query('SELECT id, submissionId, action, editor, note, snapshotJson, createdAt FROM submissionHistory ORDER BY submissionId, createdAt, id');

const submissionById = new Map(submissions.map((row) => [Number(row.id), row]));
const experimentBySubmissionId = new Map();
for (const experiment of experiments) {
  const match = /^submission-(\d+)$/.exec(experiment.slug);
  if (match && submissionById.has(Number(match[1]))) {
    experimentBySubmissionId.set(Number(match[1]), experiment);
  }
}
const historiesBySubmissionId = new Map();
for (const history of histories) {
  const id = Number(history.submissionId);
  const list = historiesBySubmissionId.get(id) ?? [];
  list.push(history);
  historiesBySubmissionId.set(id, list);
}

const lifecycleFor = (category) => {
  if (category === 'Formal Experimental Designs') return 'design';
  if (category === 'Completed Experimental Projects') return 'completed';
  return 'idea';
};
const clean = (value) => value === '' ? null : (value ?? null);
const statusFor = (status) => status === 'approved' ? 'published' : status === 'rejected' ? 'rejected' : 'pending';
const actionFor = (action) => ({
  submitted: 'created',
  approved: 'published',
  rejected: 'review_rejected',
  edited: 'edited_by_admin',
}[action] ?? `legacy_${action}`);
const recordFields = [
  'slug', 'recordKind', 'discipline', 'category', 'status', 'lifecycle', 'visibility', 'title', 'abstract',
  'theoreticalBasis', 'historicalBackground', 'hypothesis', 'procedure', 'materials', 'expectedOutput',
  'results', 'limitations', 'nextQuestion', 'ethicsReviewed', 'ethicsNotes', 'authorName', 'authorMemberId',
  'ownerOpenId', 'forkOfRecordId', 'reviewComment', 'requiredChanges', 'reviewedBy', 'reviewedAt', 'publishedAt',
];
const diffFields = (before, after) => recordFields.filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));

function snapshotFor(record, source = {}) {
  const snapshot = {};
  for (const field of recordFields) snapshot[field] = record[field] ?? null;
  if (source.memberName !== undefined) snapshot.authorName = clean(source.memberName);
  if (source.memberId !== undefined) snapshot.authorMemberId = clean(source.memberId);
  if (source.theoreticalBasis !== undefined) snapshot.theoreticalBasis = clean(source.theoreticalBasis);
  if (source.historicalBackground !== undefined) snapshot.historicalBackground = clean(source.historicalBackground);
  if (source.hypothesis !== undefined) snapshot.hypothesis = clean(source.hypothesis);
  if (source.procedure !== undefined) snapshot.procedure = clean(source.procedure);
  if (source.materials !== undefined) snapshot.materials = clean(source.materials);
  if (source.expectedOutput !== undefined) snapshot.expectedOutput = clean(source.expectedOutput);
  if (source.title !== undefined) snapshot.title = source.title;
  if (source.discipline !== undefined) snapshot.discipline = source.discipline;
  if (source.status !== undefined) snapshot.status = statusFor(source.status);
  if (source.rejectionComment !== undefined) snapshot.reviewComment = clean(source.rejectionComment);
  return snapshot;
}

async function insertRecord(record) {
  const columns = Object.keys(record);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((column) => record[column]);
  const [result] = await db.execute(`INSERT INTO records (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES (${placeholders})`, values);
  return Number(result.insertId);
}

async function insertRevision(recordId, revisionNo, action, summary, changedFields, snapshot, history, editorRole) {
  await db.execute(
    'INSERT INTO recordRevisions (recordId, revisionNo, action, summary, changedFields, snapshotJson, editorOpenId, editorName, editorRole, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [recordId, revisionNo, action, summary, JSON.stringify(changedFields), JSON.stringify(snapshot), null, history?.editor ?? null, editorRole, history?.note ?? null, history?.createdAt ?? new Date()],
  );
}

await db.beginTransaction();
try {
  const migrated = [];
  const migratedSubmissionIds = new Set();

  for (const experiment of experiments) {
    const match = /^submission-(\d+)$/.exec(experiment.slug);
    const submission = match ? submissionById.get(Number(match[1])) : null;
    const merged = Boolean(submission);
    if (merged) migratedSubmissionIds.add(Number(submission.id));

    const category = experiment.category || submission?.publishedCategory || 'Idea Pool';
    const status = merged ? statusFor(submission.status) : 'published';
    const record = {
      slug: experiment.slug,
      recordKind: merged ? 'project' : 'reference',
      discipline: experiment.discipline || submission?.discipline || 'Social Psychology',
      category,
      status,
      lifecycle: merged ? lifecycleFor(category) : null,
      visibility: 'public',
      title: experiment.title || submission?.title,
      abstract: null,
      theoreticalBasis: clean(submission?.theoreticalBasis ?? experiment.theoreticalBasis),
      historicalBackground: clean(submission?.historicalBackground ?? experiment.historicalBackground),
      hypothesis: clean(submission?.hypothesis ?? experiment.hypothesis),
      procedure: clean(submission?.procedure ?? experiment.procedure),
      materials: clean(submission?.materials),
      expectedOutput: clean(submission?.expectedOutput),
      results: null,
      limitations: null,
      nextQuestion: null,
      ethicsReviewed: 0,
      ethicsNotes: null,
      authorName: clean(submission?.memberName ?? experiment.author),
      authorMemberId: clean(submission?.memberId),
      ownerOpenId: null,
      forkOfRecordId: null,
      reviewComment: clean(submission?.rejectionComment),
      requiredChanges: null,
      reviewedBy: clean(submission?.reviewedBy),
      reviewedAt: submission?.reviewedAt ?? null,
      publishedAt: status === 'published' ? (experiment.createdAt ?? submission?.reviewedAt ?? null) : null,
      revisionCount: 1,
      createdAt: experiment.createdAt,
      updatedAt: experiment.updatedAt,
      deletedAt: null,
    };
    const recordId = await insertRecord(record);
    migrated.push({ recordId, record, submission, experiment });
  }

  for (const submission of submissions) {
    if (migratedSubmissionIds.has(Number(submission.id))) continue;
    const category = submission.publishedCategory || 'Idea Pool';
    const status = statusFor(submission.status);
    const record = {
      slug: `submission-${submission.id}`,
      recordKind: 'project',
      discipline: submission.discipline,
      category,
      status,
      lifecycle: lifecycleFor(category),
      visibility: 'public',
      title: submission.title,
      abstract: null,
      theoreticalBasis: clean(submission.theoreticalBasis),
      historicalBackground: clean(submission.historicalBackground),
      hypothesis: clean(submission.hypothesis),
      procedure: clean(submission.procedure),
      materials: clean(submission.materials),
      expectedOutput: clean(submission.expectedOutput),
      results: null,
      limitations: null,
      nextQuestion: null,
      ethicsReviewed: 0,
      ethicsNotes: null,
      authorName: clean(submission.memberName),
      authorMemberId: clean(submission.memberId),
      ownerOpenId: null,
      forkOfRecordId: null,
      reviewComment: clean(submission.rejectionComment),
      requiredChanges: null,
      reviewedBy: clean(submission.reviewedBy),
      reviewedAt: submission.reviewedAt ?? null,
      publishedAt: status === 'published' ? submission.reviewedAt : null,
      revisionCount: 1,
      createdAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
      deletedAt: null,
    };
    const recordId = await insertRecord(record);
    migrated.push({ recordId, record, submission, experiment: null });
  }

  for (const item of migrated) {
    const { recordId, record, submission, experiment } = item;
    if (!submission) {
      const snapshot = snapshotFor(record);
      await insertRevision(recordId, 1, 'created', 'Migrated academic reference', recordFields, snapshot, null, 'system');
      continue;
    }

    const legacyHistories = historiesBySubmissionId.get(Number(submission.id)) ?? [];
    let previous = snapshotFor(record);
    const historyItems = legacyHistories.length ? legacyHistories : [{ action: 'submitted', editor: submission.memberName, note: 'Migrated original submission', snapshotJson: JSON.stringify(submission), createdAt: submission.submittedAt }];
    for (let index = 0; index < historyItems.length; index += 1) {
      const history = historyItems[index];
      let raw = JSON.parse(history.snapshotJson);
      raw = raw.after ?? raw;
      const snapshot = snapshotFor(record, raw);
      if (history.action === 'submitted') snapshot.status = 'pending';
      if (history.action === 'approved') snapshot.status = 'published';
      if (history.action === 'rejected') snapshot.status = 'rejected';
      snapshot.publishedAt = snapshot.status === 'published' ? (submission.reviewedAt ?? record.publishedAt) : null;
      const changedFields = index === 0 ? recordFields : diffFields(previous, snapshot);
      await insertRevision(recordId, index + 1, actionFor(history.action), `Migrated: ${history.action}`, changedFields.length ? changedFields : ['status'], snapshot, history, history.action === 'submitted' ? 'member' : 'admin');
      previous = snapshot;
    }
    await db.execute('UPDATE records SET revisionCount = ? WHERE id = ?', [historyItems.length, recordId]);
  }

  await db.commit();
  const [counts] = await db.query('SELECT (SELECT COUNT(*) FROM records) AS records, (SELECT COUNT(*) FROM recordRevisions) AS revisions, (SELECT COUNT(*) FROM attachments) AS attachments');
  console.log(JSON.stringify({ migratedRecords: migrated.length, ...counts[0] }, null, 2));
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
