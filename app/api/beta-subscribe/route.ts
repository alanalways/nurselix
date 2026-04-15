import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Phase 2+: save to BetaSubscriber table
    console.log(`Beta subscriber: ${email}`);

    return NextResponse.json({ success: true, message: "訂閱成功" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
