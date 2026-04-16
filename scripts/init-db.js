#!/usr/bin/env node
/**
 * Applies prisma/init.sql + prisma/migrations/*.sql to the database at startup.
 * Runs each statement individually and ignores "already exists" errors,
 * so the script is safe to run on every deploy.
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const ALREADY_EXISTS_CODES = new Set([
  "42P07", // duplicate_table
  "42710", // duplicate_object
  "42P00", // invalid_schema_name (unused but harmless to ignore)
  "23505", // unique_violation
  "42701", // duplicate_column
  "42P11", // duplicate_cursor (unused)
  "42723", // duplicate_function (unused)
]);

async function runSqlFile(pool, filePath) {
  if (!fs.existsSync(filePath)) return { applied: 0, skipped: 0 };

  const sql = fs.readFileSync(filePath, "utf8");
  // Split on ";" followed by newline, but keep DO $$ … END$$ blocks intact.
  const stmts = splitStatements(sql);

  let applied = 0;
  let skipped = 0;
  for (const stmt of stmts) {
    try {
      await pool.query(stmt);
      applied++;
    } catch (err) {
      if (ALREADY_EXISTS_CODES.has(err.code)) {
        skipped++;
      } else {
        console.warn(`[init-db] Warn (${path.basename(filePath)}): ${err.message}`);
      }
    }
  }
  console.log(`[init-db] ${path.basename(filePath)} — applied ${applied}, skipped ${skipped}`);
  return { applied, skipped };
}

function splitStatements(sql) {
  // Naive splitter that is DO $$ … $$ aware.
  const out = [];
  let buf = "";
  let inDollar = false;
  const lines = sql.split("\n");
  for (const line of lines) {
    if (line.includes("$$")) inDollar = !inDollar;
    buf += line + "\n";
    if (!inDollar && /;\s*$/.test(line)) {
      const trimmed = buf.trim();
      if (trimmed && !trimmed.startsWith("--")) out.push(trimmed);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail && !tail.startsWith("--")) out.push(tail);
  return out;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[init-db] DATABASE_URL not set — skipping schema init");
    return;
  }

  const prismaDir = path.join(__dirname, "..", "prisma");
  const initPath = path.join(prismaDir, "init.sql");
  const migrationsDir = path.join(prismaDir, "migrations");

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 15000 });
  try {
    await runSqlFile(pool, initPath);

    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort(); // filenames sorted alphabetically
      for (const f of files) {
        await runSqlFile(pool, path.join(migrationsDir, f));
      }
    }

    console.log("[init-db] Schema init complete");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[init-db] Fatal error:", err.message);
});
