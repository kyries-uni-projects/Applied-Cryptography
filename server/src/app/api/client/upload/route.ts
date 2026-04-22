import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCertificate } from "@/lib/crypto";
import { logAction } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id")!;
  const certs = await prisma.uploadedCertificate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(certs);
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")!;
    const username = request.headers.get("x-username") || "unknown";
    const { certPem, label } = await request.json();

    if (!certPem) return NextResponse.json({ error: "Certificate PEM là bắt buộc" }, { status: 400 });

    const info = parseCertificate(certPem);
    const uploaded = await prisma.uploadedCertificate.create({
      data: {
        userId, certPem, label: label || info.subjectDN.split(",")[0] || "Uploaded Cert",
        subjectDN: info.subjectDN, issuerDN: info.issuerDN,
        notBefore: info.notBefore, notAfter: info.notAfter,
      },
    });

    await logAction(userId, username, "UPLOAD_CERT", `Upload chứng chỉ: ${uploaded.label}`);
    return NextResponse.json(uploaded);
  } catch (error) {
    console.error("Upload cert error:", error);
    return NextResponse.json({ error: "Lỗi parse certificate" }, { status: 400 });
  }
}
