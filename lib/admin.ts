import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@/types";

/**
 * Guard for admin-only API routes. Returns either a bypass token or a
 * NextResponse 401/403 to short-circuit the handler.
 *
 *     const guard = await requireAdmin();
 *     if (guard instanceof NextResponse) return guard;
 *     const session = guard;
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user.role as Role) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }
  return session;
}
