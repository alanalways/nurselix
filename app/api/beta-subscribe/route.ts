import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;

    await prisma.betaSubscriber.upsert({
      where: { email },
      update: { userId },
      create: { email, userId },
    });

    return NextResponse.json({ success: true, message: "訂閱成功" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
