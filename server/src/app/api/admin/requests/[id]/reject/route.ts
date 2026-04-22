import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "admin";
    const { reason } = await request.json();

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

    await prisma.certificateRequest.update({
      where: { id },
      data: { status: "REJECTED", rejectReason: reason || "Không đạt yêu cầu" },
    });

    await logAction(userId, username, "REJECT_CSR", `Từ chối CSR #${id.slice(0, 8)} cho domain ${certRequest.domain} (user: ${certRequest.user.username}). Lý do: ${reason}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject request error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
