#!/usr/bin/env node
/**
 * Admin user + Achievement master list seeder.
 *
 * Usage:
 *   node scripts/seed-admin.js
 *
 * Creates / promotes cmshj30326@gmail.com to ADMIN and inserts the canonical
 * achievement catalogue (idempotent: ON CONFLICT DO NOTHING).
 */

const { Pool } = require("pg");
const crypto = require("crypto");

require("dotenv").config?.();

const ADMIN_EMAIL = "cmshj30326@gmail.com";

const ACHIEVEMENTS = [
  { key: "streak_3",        name: "連續 3 天",    description: "連續 3 天完成每日目標", icon: "flame" },
  { key: "streak_7",        name: "連續 7 天",    description: "連續 7 天完成每日目標", icon: "flame" },
  { key: "streak_30",       name: "連續 30 天",   description: "連續 30 天完成每日目標", icon: "flame" },
  { key: "streak_100",      name: "連續 100 天",  description: "連續 100 天完成每日目標", icon: "flame" },
  { key: "pharma_master",   name: "藥理達人",     description: "藥理 domain 答對率達 80% 以上", icon: "pill" },
  { key: "speed_star",      name: "速度之星",     description: "平均每題用時少於 30 秒", icon: "zap" },
  { key: "perfectionist",   name: "完美主義",     description: "某次練習全部答對", icon: "sparkles" },
  { key: "first_hundred",   name: "百題勇者",     description: "累計完成 100 道題目", icon: "trophy" },
  { key: "first_thousand",  name: "千題傳奇",     description: "累計完成 1000 道題目", icon: "crown" },
  { key: "first_assessment",name: "首次評估",     description: "完成初始能力評估", icon: "compass" },
  { key: "first_cat_pass",  name: "首次過關",     description: "首次通過 CAT 模擬考試", icon: "award" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[seed-admin] DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    // 1. Promote the admin email
    const found = await client.query('SELECT id, role FROM "User" WHERE email = $1', [ADMIN_EMAIL]);
    if (found.rowCount === 0) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await client.query(
        `INSERT INTO "User" (id, email, name, role, plan, "isActive", "trialUsed", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, false, $6, $6)`,
        [id, ADMIN_EMAIL, "Nurslix Admin", "ADMIN", "ELITE", now],
      );
      await client.query(
        `INSERT INTO "UserSettings" ("userId", "dailyGoal", notification, theme, "fontSize", "updatedAt")
         VALUES ($1, 10, true, 'dark', 'medium', NOW())
         ON CONFLICT ("userId") DO NOTHING`,
        [id],
      );
      console.log(`[seed-admin] Created admin user ${ADMIN_EMAIL} (${id})`);
    } else if (found.rows[0].role !== "ADMIN") {
      await client.query('UPDATE "User" SET role = $1, plan = $2 WHERE email = $3', ["ADMIN", "ELITE", ADMIN_EMAIL]);
      console.log(`[seed-admin] Promoted existing user ${ADMIN_EMAIL} to ADMIN + ELITE`);
    } else {
      console.log(`[seed-admin] ${ADMIN_EMAIL} already ADMIN`);
    }

    // 2. Achievements catalogue
    let inserted = 0;
    for (const a of ACHIEVEMENTS) {
      const id = crypto.randomUUID();
      const res = await client.query(
        `INSERT INTO "Achievement" (id, key, name, description, icon)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (key) DO NOTHING`,
        [id, a.key, a.name, a.description, a.icon],
      );
      inserted += res.rowCount;
    }
    console.log(`[seed-admin] Inserted ${inserted} new achievements (total catalogue size: ${ACHIEVEMENTS.length})`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed-admin] Fatal error:", err);
  process.exit(1);
});
