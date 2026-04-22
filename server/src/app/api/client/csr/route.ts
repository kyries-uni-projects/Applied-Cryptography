import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCSR } from "@/lib/crypto";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")!;
    const username = request.headers.get("x-username") || "unknown";
    const { keyPairId, domain, country, organization } = await request.json();

    if (!keyPairId || !domain) return NextResponse.json({ error: "Key pair và domain là bắt buộc" }, { status: 400 });

    const keyPair = await prisma.keyPair.findFirst({ where: { id: keyPairId, userId } });
    if (!keyPair) return NextResponse.json({ error: "Key pair không tồn tại" }, { status: 404 });

    const csrPem = generateCSR({ privateKeyPem: keyPair.privateKeyPem, domain, country, organization });

    const certReq = await prisma.certificateRequest.create({
      data: { userId, keyPairId, csrPem, domain },
    });

    await logAction(userId, username, "CREATE_CSR", `Tạo CSR cho domain ${domain}`);
    return NextResponse.json(certReq);
  } catch (error) {
    console.error("Create CSR error:", error);
    return NextResponse.json({ error: "Lỗi tạo CSR" }, { status: 500 });
  }
}
