import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCRL } from "@/lib/crypto";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    const crl = await prisma.cRL.findFirst({
      orderBy: { issuedAt: "desc" },
    });
    return NextResponse.json(crl);
  } catch (error) {
    console.error("Get CRL error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "admin";

    const config = await prisma.caConfig.findFirst();
    if (!config?.rootCertPem || !config?.rootKeyPem) {
      return NextResponse.json({ error: "Root Certificate chưa được tạo" }, { status: 400 });
    }

    // Get all revoked certificates
    const revokedCerts = await prisma.certificate.findMany({
      where: { status: "REVOKED" },
    });

    const entries = revokedCerts.map((cert) => ({
      serialNumber: cert.serialNumber,
      revocationDate: cert.revokedAt || new Date(),
    }));

    const result = generateCRL(
      config.rootCertPem,
      config.rootKeyPem,
      entries,
      config.hashAlgorithm
    );

    await prisma.cRL.create({
      data: {
        crlPem: result.crlPem,
        issuedAt: result.issuedAt,
        nextUpdate: result.nextUpdate,
      },
    });

    await logAction(userId, username, "UPDATE_CRL", `Cập nhật CRL với ${entries.length} chứng chỉ thu hồi`);

    return NextResponse.json({
      success: true,
      crlPem: result.crlPem,
      entriesCount: entries.length,
    });
  } catch (error) {
    console.error("Generate CRL error:", error);
    return NextResponse.json({ error: "Lỗi tạo CRL" }, { status: 500 });
  }
}
