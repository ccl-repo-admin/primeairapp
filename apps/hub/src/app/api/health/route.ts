import { NextResponse } from "next/server";
import { prisma } from "@primeair/db";

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ db: "ok", users: count });
  } catch (err) {
    return NextResponse.json({ db: "error", error: String(err) }, { status: 500 });
  }
}
