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

    const certRequest = await prisma.certificateRequest.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });

    if (!certRequest) {
      return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    }

    if (certRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Yêu cầu đã được xử lý" }, { status: 400 });
    }

    const config = await prisma.caConfig.findFirst();
    if (!config?.rootCertPem || !config?.rootKeyPem) {
      return NextResponse.json({ error: "Root Certificate chưa được tạo" }, { status: 400 });
    }

    const serialNumber = generateSerialNumber();

    const result = signCertificate({
      csrPem: certRequest.csrPem,
      rootCertPem: config.rootCertPem,
      rootKeyPem: config.rootKeyPem,
      serialNumber,
      validityDays: config.validityDays,
      hashAlgorithm: config.hashAlgorithm,
    });

    // Update request status and create certificate
    await prisma.$transaction([
      prisma.certificateRequest.update({
        where: { id },
        data: { status: "APPROVED" },
      }),
      prisma.certificate.create({
        data: {
          requestId: id,
          userId: certRequest.userId,
          certPem: result.certPem,
          serialNumber: result.serialNumber,
          subjectDN: result.subjectDN,
          issuerDN: result.issuerDN,
          notBefore: result.notBefore,
          notAfter: result.notAfter,
        },
      }),
    ]);

    await logAction(userId, username, "APPROVE_CSR", `Phê duyệt CSR #${id.slice(0, 8)} cho domain ${certRequest.domain} (user: ${certRequest.user.username})`);

    return NextResponse.json({ success: true, certPem: result.certPem });
  } catch (error) {
    console.error("Approve request error:", error);
    return NextResponse.json({ error: "Lỗi ký chứng chỉ" }, { status: 500 });
  }
}
