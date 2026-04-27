// 修補 5 題 answer_pointing_null：補回 F 選項與對應 rationale
import pg from "pg";
import fs from "node:fs";

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const fixes = [
  {
    id: "feac2f43-9e08-4656-bef2-069a3327b25f",
    optionF: "Monitor cardiac rhythm with continuous ECG",
    rationaleF: { en: "Continuous ECG monitoring detects arrhythmias from hyperkalemia.", zh: "高血鉀可能導致致命性心律不整，需要持續心電圖監測以及早偵測。" },
  },
  {
    id: "1a8b16ac-61fe-4cab-a6ab-b274133bb1b1",
    optionF: "Anxiety and irritability",
    rationaleF: { en: "Anxiety/irritability is a sympathetic response in hypoglycemia.", zh: "低血糖時交感神經激活產生焦慮、易怒，是經典徵象。" },
  },
  {
    id: "ef82fe66-3732-4ddf-b514-ecf73491c492",
    optionF: "Rising PaCO2 with worsening respiratory acidosis",
    rationaleF: { en: "Rising PaCO2 with respiratory acidosis indicates ventilatory failure—an absolute intubation indication.", zh: "PaCO2 上升合併呼吸性酸中毒代表通氣衰竭，是插管的絕對適應症。" },
  },
  {
    id: "49f420cd-cc9c-4d41-9938-7ce5257f0056",
    optionF: "Rinse mouth with water after use if using a corticosteroid inhaler",
    rationaleF: { en: "Rinsing prevents oral candidiasis when using corticosteroid inhalers.", zh: "使用類固醇吸入器後漱口可預防口腔念珠菌感染。" },
  },
  {
    id: "12cd0c09-24a1-4de4-b167-6046ba250046",
    optionF: "Decreased level of consciousness or lethargy",
    rationaleF: { en: "Decreased LOC indicates poor cerebral perfusion despite resuscitation.", zh: "意識狀態下降表示腦部灌流不足，輸液仍未達標。" },
  },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

for (const fix of fixes) {
  // get current question for rationale merge
  const { rows } = await client.query(`SELECT "optionRationales" FROM "Question" WHERE id = $1`, [fix.id]);
  const r = rows[0]?.optionRationales || {};
  const merged = { ...r, F: fix.rationaleF };

  await client.query(`BEGIN`);
  // Snapshot before
  const before = await client.query(`SELECT * FROM "Question" WHERE id = $1`, [fix.id]);
  await client.query(`
    INSERT INTO "QuestionVersion" ("questionId","snapshot","changedBy","reason","agentInitiated")
    VALUES ($1, $2::jsonb, 'agent:fix-null-options', 'Fill missing optionF based on explanation context', true);
  `, [fix.id, JSON.stringify(before.rows[0])]);

  await client.query(`
    UPDATE "Question"
    SET "optionF" = $1, "optionRationales" = $2::jsonb, "updatedAt" = NOW()
    WHERE id = $3
  `, [fix.optionF, JSON.stringify(merged), fix.id]);

  // Mark issue resolved
  await client.query(`
    UPDATE "QuestionQualityIssue"
    SET status = 'RESOLVED', "resolvedAt" = NOW(), "resolvedBy" = 'agent:fix-null-options',
        resolution = 'Filled optionF with content derived from explanation'
    WHERE "questionId" = $1 AND "ruleId" = 'answer_pointing_null' AND status = 'OPEN'
  `, [fix.id]);

  await client.query(`COMMIT`);
  console.log(`Fixed ${fix.id} → optionF: ${fix.optionF}`);
}

console.log(`\nDone. Fixed ${fixes.length} questions.`);
await client.end();
