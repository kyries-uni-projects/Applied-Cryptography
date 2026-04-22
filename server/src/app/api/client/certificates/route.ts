import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id")!;
  const [requests, certificates] = await Promise.all([
    prisma.certificateRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.certificate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { request: { select: { domain: true } } },
    }),
  ]);
  return NextResponse.json({ requests, certificates });
}
