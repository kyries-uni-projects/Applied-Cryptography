import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    const certs = await prisma.certificate.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
        request: { select: { domain: true } },
      },
    });
    return NextResponse.json(certs);
  } catch (error) {
    console.error("Get certificates error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "admin";
    const { certificateId, reason } = await request.json();

    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { user: { select: { username: true } } },
    });

    if (!cert) {
      return NextResponse.json({ error: "Chứng chỉ không tồn tại" }, { status: 404 });
    }

    if (cert.status === "REVOKED") {
      return NextResponse.json({ error: "Chứng chỉ đã bị thu hồi" }, { status: 400 });
    }

    await prisma.certificate.update({
      where: { id: certificateId },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    await logAction(userId, username, "REVOKE_CERT", `Thu hồi chứng chỉ SN:${cert.serialNumber.slice(0, 16)}... (user: ${cert.user.username}). Lý do: ${reason || "Admin thu hồi"}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke certificate error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
