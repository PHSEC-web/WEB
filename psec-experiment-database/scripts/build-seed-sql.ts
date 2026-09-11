import { writeFileSync } from "node:fs";
import { CLASSIC_EXPERIMENTS } from "../shared/classicExperiments";

const escape = (value: string | undefined) => value == null ? "NULL" : `'${value.replaceAll("'", "''")}'`;
const statements = CLASSIC_EXPERIMENTS.map((experiment) => `INSERT INTO experiments (slug, discipline, title, category, theoreticalBasis, historicalBackground, hypothesis, \`procedure\`, author, status) VALUES (${escape(experiment.slug)}, ${escape(experiment.discipline)}, ${escape(experiment.title)}, ${escape(experiment.category)}, ${escape(experiment.theoreticalBasis)}, ${escape(experiment.historicalBackground)}, ${escape(experiment.hypothesis)}, ${escape(experiment.procedure)}, ${escape(experiment.author)}, ${escape(experiment.status)});`);
writeFileSync("drizzle/seed.sql", statements.join("\n"));
console.log(`Wrote ${statements.length} experiment seed statements.`);
