/**
 * Admin 觸發的 DB migration 端點。
 * 執行 prisma/migrations/*.sql 中的 IF NOT EXISTS 語句，安全可重複呼叫。
 *
 * 自動列舉 prisma/migrations 下所有 .sql 檔（依檔名排序執行），
 * 不再在 code 內維護白名單；新增 phase 只要把 .sql 放進 migrations/ 就會被執行。
 * 所有 SQL 必須是 idempotent（CREATE TABLE IF NOT EXISTS / ALTER TABLE IF NOT EXISTS …）。
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const allFiles = await fs.readdir(migrationsDir);
  // Auto-discover: every .sql in prisma/migrations runs in lexicographic order
  // (phase3 < phase7 < ... < phase17, then upgrade_requests).
  const MIGRATIONS = allFiles.filter((f) => f.endsWith(".sql")).sort();

  const results: { file: string; ok: boolean; error?: string }[] = [];

  for (const name of MIGRATIONS) {
    const filePath = path.join(migrationsDir, name);
    try {
      const sql = await fs.readFile(filePath, "utf8");
      // 逐個 statement 執行（依 ; 切）— Prisma $executeRawUnsafe 一次只能一條
      const statements = sql
        .split(/;\s*(?:--[^\n]*)?\n/)
        .map((s) => s.replace(/^\s*--[^\n]*\n?/gm, "").trim())
        .filter(Boolean);

      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }
      results.push({ file: name, ok: true });
    } catch (err) {
      results.push({
        file: name,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 500 });
}
