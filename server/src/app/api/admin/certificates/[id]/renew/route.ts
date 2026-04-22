import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signCertificate, generateSerialNumber } from "@/lib/crypto";
import { logAction } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "admin";

    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: {
        request: true,
        user: { select: { username: true } },
      },
    });

    if (!cert) {
      return NextResponse.json({ error: "Chứng chỉ không tồn tại" }, { status: 404 });
    }

    if (!cert.request) {
      return NextResponse.json({ error: "Không tìm thấy CSR gốc" }, { status: 400 });
    }

    const config = await prisma.caConfig.findFirst();
    if (!config?.rootCertPem || !config?.rootKeyPem) {
      return NextResponse.json({ error: "Root Certificate chưa được tạo" }, { status: 400 });
    }

    // Revoke old cert
    await prisma.certificate.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    // Sign new cert with same CSR
    const serialNumber = generateSerialNumber();
    const result = signCertificate({
      csrPem: cert.request.csrPem,
      rootCertPem: config.rootCertPem,
      rootKeyPem: config.rootKeyPem,
      serialNumber,
      validityDays: config.validityDays,
      hashAlgorithm: config.hashAlgorithm,
    });

    const newCert = await prisma.certificate.create({
      data: {
        userId: cert.userId,
        certPem: result.certPem,
        serialNumber: result.serialNumber,
        subjectDN: result.subjectDN,
        issuerDN: result.issuerDN,
        notBefore: result.notBefore,
        notAfter: result.notAfter,
      },
    });

    await logAction(userId, username, "RENEW_CERT", `Gia hạn chứng chỉ SN:${cert.serialNumber.slice(0, 16)}... → SN:${newCert.serialNumber.slice(0, 16)}... (user: ${cert.user.username})`);

    return NextResponse.json({ success: true, newCertId: newCert.id });
  } catch (error) {
    console.error("Renew certificate error:", error);
    return NextResponse.json({ error: "Lỗi gia hạn chứng chỉ" }, { status: 500 });
  }
}
