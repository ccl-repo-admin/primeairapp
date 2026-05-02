import { NextRequest, NextResponse } from "next/server";
import { sendOtp } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json() as { phone: string };
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });
    await sendOtp(phone);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("OTP send error:", err);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
