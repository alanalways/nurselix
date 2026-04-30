#!/usr/bin/env node
import pg from "pg";
import fs from "node:fs";

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Append "(Select all that apply.)" after EN question mark
const sqlEn = `
  UPDATE "Question"
  SET stem = regexp_replace(stem, '([?])\\s*$', '\\1 (Select all that apply.)'),
      "updatedAt" = NOW()
  WHERE module='NCLEX' AND "questionType"='SATA' AND status='APPROVED'
    AND stem ~ '[?]\\s*$'
    AND stem NOT ILIKE '%apply%' AND stem NOT ILIKE '%select all%'
  RETURNING id;
`;
const r1 = await c.query(sqlEn);
console.log("Updated EN stems:", r1.rows.length);

// Append （選所有適合的）after Chinese question mark
const sqlZh = `
  UPDATE "Question"
  SET "stemZh" = regexp_replace("stemZh", '([？])\\s*$', '\\1（選所有適合的）'),
      "updatedAt" = NOW()
  WHERE module='NCLEX' AND "questionType"='SATA' AND status='APPROVED'
    AND "stemZh" ~ '[？]\\s*$'
    AND "stemZh" NOT LIKE '%選所有%'
    AND "stemZh" NOT LIKE '%選擇所有%'
  RETURNING id;
`;
const r2 = await c.query(sqlZh);
console.log("Updated ZH stems:", r2.rows.length);

await c.end();
