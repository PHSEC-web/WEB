import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to repair the evidence schema");
}

const connection = await mysql.createConnection(databaseUrl);
const targetMigrationTag = "0012_bent_krista_starr";

async function tableNames() {
  const [rows] = await connection.query(
    "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
  );
  return new Set(rows.map(row => row.tableName));
}

async function columnsFor(tableName) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME AS columnName, IS_NULLABLE AS isNullable
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return new Map(rows.map(row => [row.columnName, row.isNullable]));
}

async function indexesFor(tableName) {
  const [rows] = await connection.query(
    `SELECT DISTINCT INDEX_NAME AS indexName
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return new Set(rows.map(row => row.indexName));
}

async function requireBaselineTables() {
  const names = await tableNames();
  const required = [
    "__drizzle_migrations",
    "users",
    "experiments",
    "submissions",
    "submissionHistory",
    "attachments",
    "records",
    "recordRevisions",
    "evidenceSubmissions",
    "executionRecords",
  ];
  const missing = required.filter(name => !names.has(name));
  if (missing.length) {
    throw new Error(`Refusing to baseline: missing required tables (${missing.join(", ")})`);
  }
}

async function requireColumns(tableName, requiredColumns) {
  const columns = await columnsFor(tableName);
  const missing = requiredColumns.filter(column => !columns.has(column));
  if (missing.length) {
    throw new Error(
      `Refusing to baseline: ${tableName} is missing ${missing.join(", ")}`,
    );
  }
  return columns;
}

async function ensureEvidenceColumns() {
  for (const tableName of ["evidenceSubmissions", "executionRecords"]) {
    let columns = await columnsFor(tableName);
    if (!columns.has("submitterName") && columns.has("memberId")) {
      await connection.query(
        `ALTER TABLE \`${tableName}\` RENAME COLUMN \`memberId\` TO \`submitterName\``,
      );
      console.log(`${tableName}: renamed memberId to submitterName`);
      columns = await columnsFor(tableName);
    }
    if (!columns.has("recordId")) {
      await connection.query(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`recordId\` int NULL`,
      );
      console.log(`${tableName}: added nullable recordId`);
      columns = await columnsFor(tableName);
    }
    if (columns.get("experimentId") !== "YES") {
      await connection.query(
        `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`experimentId\` int NULL`,
      );
      console.log(`${tableName}: made experimentId nullable`);
    }
  }

  const indexes = await indexesFor("executionRecords");
  if (!indexes.has("execution_records_record_created_idx")) {
    await connection.query(
      "CREATE INDEX `execution_records_record_created_idx` ON `executionRecords` (`recordId`, `createdAt`)",
    );
    console.log("executionRecords: added recordId index");
  }
}

async function ensureEmailLoginCodes() {
  const names = await tableNames();
  if (!names.has("emailLoginCodes")) {
    await connection.query(`
      CREATE TABLE \`emailLoginCodes\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`email\` varchar(320) NOT NULL,
        \`codeHash\` varchar(64) NOT NULL,
        \`expiresAt\` timestamp NOT NULL,
        \`attempts\` int NOT NULL DEFAULT 0,
        \`requestedIp\` varchar(64),
        \`usedAt\` timestamp,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        CONSTRAINT \`emailLoginCodes_id\` PRIMARY KEY(\`id\`)
      )
    `);
    console.log("emailLoginCodes: created table");
  }
  const indexes = await indexesFor("emailLoginCodes");
  if (!indexes.has("email_login_codes_email_created_idx")) {
    await connection.query(
      "CREATE INDEX `email_login_codes_email_created_idx` ON `emailLoginCodes` (`email`, `createdAt`)",
    );
    console.log("emailLoginCodes: added email index");
  }
}

async function baselineMigrations() {
  const journal = JSON.parse(
    await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
  );
  const targetIndex = journal.entries.findIndex(
    entry => entry.tag === targetMigrationTag,
  );
  if (targetIndex < 0) throw new Error(`Migration ${targetMigrationTag} was not found`);

  const [rows] = await connection.query(
    "SELECT hash, created_at AS createdAt FROM `__drizzle_migrations` ORDER BY created_at",
  );
  const existing = new Map(rows.map(row => [Number(row.createdAt), row.hash]));

  for (const entry of journal.entries.slice(0, targetIndex + 1)) {
    const sql = await readFile(
      new URL(`../drizzle/${entry.tag}.sql`, import.meta.url),
    );
    const hash = createHash("sha256").update(sql).digest("hex");
    const current = existing.get(Number(entry.when));
    if (current && current !== hash) {
      throw new Error(`Migration ledger conflict at ${entry.tag}; stop and inspect it manually`);
    }
    if (!current) {
      await connection.query(
        "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
        [hash, entry.when],
      );
      existing.set(Number(entry.when), hash);
      console.log(`migration ledger: recorded ${entry.tag}`);
    }
  }
}

try {
  await requireBaselineTables();
  await ensureEvidenceColumns();
  await requireColumns("evidenceSubmissions", [
    "submitterName",
    "experimentId",
    "observationNotes",
    "status",
  ]);
  await requireColumns("executionRecords", [
    "experimentId",
    "observationNotes",
    "createdAt",
  ]);
  await ensureEmailLoginCodes();
  await connection.query(`
    UPDATE \`records\`
       SET \`category\` = CASE
         WHEN \`lifecycle\` = 'completed' THEN 'Completed Experimental Projects'
         WHEN \`lifecycle\` IN ('design', 'in_progress') THEN 'Formal Experimental Designs'
         ELSE 'Idea Pool'
       END
     WHERE \`recordKind\` = 'project' AND \`category\` = 'Club Projects'
  `);
  await baselineMigrations();
  console.log("Legacy database baseline repaired through migration 0012.");
  console.log("Run pnpm exec drizzle-kit migrate next; it will apply only newer migrations.");
} finally {
  await connection.end();
}
