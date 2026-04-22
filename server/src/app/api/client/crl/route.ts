import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const crl = await prisma.cRL.findFirst({ orderBy: { issuedAt: "desc" } });
  const revokedCerts = await prisma.certificate.findMany({
    where: { status: "REVOKED" },
    select: { serialNumber: true, subjectDN: true, revokedAt: true },
    orderBy: { revokedAt: "desc" },
  });
  return NextResponse.json({ crl, revokedCerts });
}
