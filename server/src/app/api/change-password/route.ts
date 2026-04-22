import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword, hashPassword } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "unknown";

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại và mật khẩu mới là bắt buộc" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !comparePassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });

    await logAction(userId, username, "CHANGE_PASSWORD", "Đổi mật khẩu thành công");

    return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
