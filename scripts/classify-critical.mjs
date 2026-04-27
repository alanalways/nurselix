// 把 critical 分成「真矛盾」與「假陽性（找錯題型 stem）」
import fs from "node:fs";

const all = JSON.parse(fs.readFileSync("scripts/open-issues.json", "utf8"));
const critical = all.filter(r => r.severity === "CRITICAL");

const NEG_PAT = [
  /requires? (further |additional )?(teaching|instruction|education|clarification|correction|intervention)/i,
  /indicates? (a )?need for (further |additional )?(teaching|instruction|education|clarification|correction)/i,
  /is (NOT |inappropriate|incorrect|contraindicated|wrong)/i,
  /is contraindicated/i,
  /should the nurse not/i,
  /which action breaks/i,
  /\bNOT appropriate\b/i,
  /which statement requires correction/i,
  /which observation indicates the (client |patient )?needs/i,
  /needs further/i,
  /需要進一步(指導|教學|衛教|教育|澄清)/,
  /表示需要(進一步|更多)/,
  /何者(不|錯誤|不適當|不正確)/,
  /哪項.*錯誤/,
  /違反/,
  /禁忌/,
];

const realMismatch = [];
const falsePositives = [];

critical.forEach(r => {
  const stem = (r.stem || "") + " " + (r.stemZh || "");
  const isNeg = NEG_PAT.some(re => re.test(stem));

  // For answer_pointing_null, always real
  if (r.ruleId === "answer_pointing_null") {
    realMismatch.push(r);
    return;
  }
  // For answer_rationale_contradiction in negative-stem questions, false positive
  if (isNeg) falsePositives.push(r);
  else realMismatch.push(r);
});

console.log(`真矛盾候選: ${realMismatch.length}`);
console.log(`假陽性 (找錯題型 stem): ${falsePositives.length}`);
console.log("\n=== 真矛盾候選 ===");
realMismatch.forEach((r, i) => {
  console.log(`\n[${i+1}] qid=${r.qid} rule=${r.ruleId}`);
  console.log(`  stem: ${(r.stem||'').slice(0,140)}`);
  console.log(`  ans: ${r.correctAnswer}`);
  console.log(`  detail: ${r.detail}`);
});

fs.writeFileSync("scripts/real-critical.json", JSON.stringify(realMismatch, null, 2));
fs.writeFileSync("scripts/false-positives.json", JSON.stringify(falsePositives.map(r => ({ qid: r.qid, issueId: r.id, stem: r.stem.slice(0,80) })), null, 2));
console.log(`\nSaved: scripts/real-critical.json, scripts/false-positives.json`);
