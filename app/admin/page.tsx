import { redirect } from "next/navigation";

/**
 * /admin → /admin/command-center
 *
 * The old dashboard contents (overview, seed data, test user, achievements,
 * purge) have moved into command-center tabs:
 *   I  Overview          — replaces the old top stats
 *   VIII Users           — list / plan / activate
 *   X  Vocab             — seed jobs + word browser
 *   XI Analytics         — DAU / domain error rate / API cost / weakest items
 *
 * Maintenance actions (seed-questions, achievements, test-account, migrate)
 * remain available on this page if the user appends ?legacy=1 — but the
 * default landing is the unified command-center.
 */
export default function AdminHome() {
  redirect("/admin/command-center");
}
