# PSEC Social Experiment Database — Local Migration Package

This package contains the **current source tree**, a **database export**, Drizzle migrations, documentation, and an environment-variable template for taking the PSEC Social Experiment Database to a computer or an independent server.

## Contents

| Path | Purpose |
|---|---|
| `psec-experiment-database/` | Application source, database schema, migrations, tests, and documentation. |
| `database-backup/psec-database-schema.sql` | MySQL table definitions captured at export time. |
| `database-backup/psec-database-data.json` | Current database data in portable JSON form. **Excluded from version control** — see below. |
| `psec-experiment-database/LOCAL_ENVIRONMENT_TEMPLATE.txt` | Safe local environment-variable template. It contains **no live passwords or API keys**. |

## What is intentionally excluded

The archive excludes `node_modules`, generated `dist` output, Git internals, Manus preview/debug files, deployment configuration, and all populated environment files. No administrator passwords, database credentials, API keys, OAuth secrets, or session secrets are included.

Administrator passwords are read from the `PSEC_ADMIN_PASSWORDS` environment variable only. No credential value appears anywhere in the source tree; `server/admin.secret.test.ts` asserts against the values supplied by that variable at test time rather than against inlined literals.

## About `psec-database-data.json`

This file is listed in `.gitignore` and is therefore **not** part of a fresh clone: it contains row
data, including a real account record with an email address and OAuth `openId`. Keep it on your local
machine or in private storage.

To reconstruct a working database without it, apply the schema, then the Drizzle migrations, then the
seed data:

```bash
mysql -u root -p your_db < database-backup/psec-database-schema.sql
pnpm --dir psec-experiment-database run db:push   # applies drizzle/ migrations
mysql -u root -p your_db < psec-experiment-database/drizzle/seed.sql
```

`drizzle/seed.sql` and `shared/classicExperiments.ts` carry the experiment catalogue, so a clone plus
the seed files is enough to run the application.

Managed attachment objects stored by the current cloud runtime are represented by their database metadata only. To retain their original binary files after moving away from the managed runtime, download those files through the administrator interface before changing hosting, then upload them to the replacement object-storage service.

## Local setup

1. Install Node.js 22+ and pnpm 10+ on the target computer.
2. Install MySQL 8+ or a compatible TiDB instance.
3. Create a new empty database and run `database-backup/psec-database-schema.sql`. If you hold a local copy of `psec-database-data.json`, import its rows using a controlled import script or your database tool; otherwise load `psec-experiment-database/drizzle/seed.sql` for the experiment catalogue.
4. Create a private environment configuration file from `LOCAL_ENVIRONMENT_TEMPLATE.txt` and fill in the local database URL, JWT secret, OAuth configuration, and admin password list. Do **not** commit the populated file.
5. In `psec-experiment-database/`, run `pnpm install`, then `pnpm check` and `pnpm build`. Start development with `pnpm dev`.

## Important hosting note

The existing project relies on Manus OAuth and managed attachment storage. For a fully independent public deployment, configure an OAuth provider and S3-compatible object storage, then update the respective integration layers. The application source, schema, migration history, records, revisions, and database content are included in this package.
