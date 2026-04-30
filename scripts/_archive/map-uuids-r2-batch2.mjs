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

const prefixes = ["28583d6f", "553c69f9", "b3922b90", "bf533714", "dae48d2f"];
const r = await c.query(
  `SELECT id FROM "Question" WHERE id LIKE ANY($1::text[])`,
  [prefixes.map(p => p + "%")]
);

const map = {};
r.rows.forEach(row => { map[row.id.slice(0, 8)] = row.id; });

const fixes = JSON.parse(fs.readFileSync("scripts/fixes-r2-batch2.json", "utf8"));
for (const fix of fixes) {
  const prefix = fix.id.slice(0, 8);
  if (map[prefix]) fix.id = map[prefix];
}
fs.writeFileSync("scripts/fixes-r2-batch2-fixed.json", JSON.stringify(fixes, null, 2));
console.log(`Patched ${fixes.length} fixes`);

await c.end();
