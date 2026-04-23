/**
 * Admin 觸發的 DB migration 端點。
 * 執行 prisma/migrations/*.sql 中的 IF NOT EXISTS 語句，安全可重複呼叫。
 * 用於 Zeabur 上初次建表（LearnerProfile、SessionDiagnosis、HermesJob、AppSetting）。
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const MIGRATIONS = ["phase10_hermes.sql", "phase13_vocabulary.sql"];

export async function POST() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const results: { file: string; ok: boolean; error?: string }[] = [];

  for (const name of MIGRATIONS) {
    const filePath = path.join(process.cwd(), "prisma", "migrations", name);
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
