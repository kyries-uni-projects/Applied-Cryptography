import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateRootCertificate } from "@/lib/crypto";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "admin";

    const config = await prisma.caConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: "CA config not found" }, { status: 404 });
    }

    const body = await request.json();
    const { commonName, organization, country } = body;

    const result = generateRootCertificate({
      keyLength: config.keyLength,
      hashAlgorithm: config.hashAlgorithm,
      validityDays: config.validityDays,
      commonName,
      organization,
      country,
    });

    await prisma.caConfig.update({
      where: { id: config.id },
      data: {
        rootKeyPem: result.privateKeyPem,
        rootCertPem: result.certPem,
      },
    });

    await logAction(userId, username, "GENERATE_ROOT_CERT", `Tạo Root Certificate mới: CN=${commonName || "CA Root Certificate"}`);

    return NextResponse.json({
      success: true,
      certPem: result.certPem,
      publicKeyPem: result.publicKeyPem,
    });
  } catch (error) {
    console.error("Generate root cert error:", error);
    return NextResponse.json({ error: "Lỗi tạo root certificate" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const config = await prisma.caConfig.findFirst();
    if (!config || !config.rootCertPem) {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({
      exists: true,
      certPem: config.rootCertPem,
    });
  } catch (error) {
    console.error("Get root cert error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
