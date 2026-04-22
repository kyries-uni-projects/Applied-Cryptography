import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    const revocations = await prisma.revocationRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
        certificate: { select: { serialNumber: true, subjectDN: true } },
      },
    });
    return NextResponse.json(revocations);
  } catch (error) {
    console.error("Get revocations error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// Approve a revocation request
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "admin";
    const { revocationId, action } = await request.json();

    const revocation = await prisma.revocationRequest.findUnique({
      where: { id: revocationId },
      include: {
        certificate: true,
        user: { select: { username: true } },
      },
    });

    if (!revocation) {
      return NextResponse.json({ error: "Yêu cầu không tồn tại" }, { status: 404 });
    }

    if (revocation.status !== "PENDING") {
      return NextResponse.json({ error: "Yêu cầu đã được xử lý" }, { status: 400 });
    }

    if (action === "APPROVE") {
      await prisma.$transaction([
        prisma.revocationRequest.update({
          where: { id: revocationId },
          data: { status: "APPROVED" },
        }),
        prisma.certificate.update({
          where: { id: revocation.certificateId },
          data: { status: "REVOKED", revokedAt: new Date() },
        }),
      ]);

      await logAction(userId, username, "APPROVE_REVOCATION", `Phê duyệt thu hồi chứng chỉ SN:${revocation.certificate.serialNumber.slice(0, 16)}... (user: ${revocation.user.username})`);
    } else {
      await prisma.revocationRequest.update({
        where: { id: revocationId },
        data: { status: "REJECTED" },
      });

      await logAction(userId, username, "REJECT_REVOCATION", `Từ chối thu hồi chứng chỉ SN:${revocation.certificate.serialNumber.slice(0, 16)}... (user: ${revocation.user.username})`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Handle revocation error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
