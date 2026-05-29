import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { scSubmitRevocationRequest } from "@/lib/sc-client";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")!;
    const username = request.headers.get("x-username") || "unknown";
    const { certificateId, reason } = await request.json();

    if (!certificateId || !reason) return NextResponse.json({ error: "Certificate ID và lý do là bắt buộc" }, { status: 400 });

    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, userId, status: "ACTIVE" } });
    if (!cert) return NextResponse.json({ error: "Chứng chỉ không tồn tại hoặc đã bị thu hồi" }, { status: 404 });

    // Check existing pending request
    const existing = await prisma.revocationRequest.findFirst({ where: { certificateId, status: "PENDING" } });
    if (existing) return NextResponse.json({ error: "Đã có yêu cầu thu hồi đang chờ duyệt" }, { status: 400 });

    const revocation = await prisma.revocationRequest.create({ data: { certificateId, userId, reason } });

    // 3. Anchor the revocation request on-chain (awaits completion)
    try {
      await scSubmitRevocationRequest(userId, revocation.id, certificateId, reason);
    } catch (err) {
      // Revert DB if blockchain fails
      await prisma.revocationRequest.delete({ where: { id: revocation.id } });
      throw err;
    }

    await logAction(userId, username, "REQUEST_REVOKE", `Yêu cầu thu hồi chứng chỉ SN:${cert.serialNumber.slice(0, 16)}...`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke request error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
