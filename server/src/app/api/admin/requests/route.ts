import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const requests = await prisma.certificateRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
        keyPair: { select: { label: true, keyLength: true } },
      },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Get requests error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
