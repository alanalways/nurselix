#!/usr/bin/env node
/**
 * Applies prisma/init.sql to the database at startup.
 * Runs each statement individually and ignores "already exists" errors,
 * so the script is safe to run on every deploy.
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[init-db] DATABASE_URL not set — skipping schema init");
    return;
  }

  const sqlPath = path.join(__dirname, "..", "prisma", "init.sql");
  if (!fs.existsSync(sqlPath)) {
    console.log("[init-db] prisma/init.sql not found — skipping");
    return;
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 10000 });

  try {
    const sql = fs.readFileSync(sqlPath, "utf8");
    // Split on statement boundaries (semicolons followed by newline or EOF)
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        // Ignore "already exists" errors (tables, types, indexes, etc.)
        const alreadyExists = ["42P07", "42710", "42P00", "23505", "42701"];
        if (alreadyExists.includes(err.code)) {
          // silent — object already created from a previous deploy
        } else {
          console.warn(`[init-db] Warning on statement: ${err.message}`);
        }
      }
    }
    console.log("[init-db] Schema init complete");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[init-db] Fatal error:", err.message);
  // Non-fatal: let the server start anyway
});
