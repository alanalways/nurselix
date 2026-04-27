// List CRITICAL quality issues from DB with question content for human/agent fix
import pg from "pg";
import fs from "node:fs";

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(`
  SELECT i.id, i."ruleId", i.severity, i.detail, i.meta,
         q.id AS qid, q.stem, q."stemZh", q."optionA", q."optionB", q."optionC", q."optionD",
         q."optionE", q."optionF", q."correctAnswer", q."correctAnswers",
         q."explanationZh", q."optionRationales", q."questionType", q.difficulty, q.status
  FROM "QuestionQualityIssue" i
  JOIN "Question" q ON q.id = i."questionId"
  WHERE i.status = 'OPEN'
  ORDER BY
    CASE i.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
    i."detectedAt";
`);

console.log(`Total open issues: ${rows.length}`);
console.log(`Critical: ${rows.filter(r=>r.severity==='CRITICAL').length}`);
console.log(`High: ${rows.filter(r=>r.severity==='HIGH').length}`);
console.log(`Medium: ${rows.filter(r=>r.severity==='MEDIUM').length}`);

fs.writeFileSync("scripts/open-issues.json", JSON.stringify(rows, null, 2));
console.log(`Saved to scripts/open-issues.json`);

await client.end();
