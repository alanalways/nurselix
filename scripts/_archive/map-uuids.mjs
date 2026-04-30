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

const prefixes = [
  "3ded0650", "49f48a26", "5bab0624", "5bb6bf92", "628170c1",
  "b47ed991", "b78302c2", "bba1b987", "cdda53a9", "f470283b",
  "b0ad68d1", "0312b318",
];
const r = await c.query(
  `SELECT id FROM "Question" WHERE id LIKE ANY($1::text[])`,
  [prefixes.map(p => p + "%")]
);

const map = {};
r.rows.forEach(row => { map[row.id.slice(0, 8)] = row.id; });

// Patch the fixes file
const fixes = JSON.parse(fs.readFileSync("scripts/fixes-r2-batch1.json", "utf8"));
for (const fix of fixes) {
  const prefix = fix.id.slice(0, 8);
  if (map[prefix]) fix.id = map[prefix];
}
fs.writeFileSync("scripts/fixes-r2-batch1-fixed.json", JSON.stringify(fixes, null, 2));
console.log(`Patched ${fixes.length} fixes with full UUIDs`);

await c.end();
