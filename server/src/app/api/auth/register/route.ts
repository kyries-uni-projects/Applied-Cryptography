import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username và password là bắt buộc" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username phải có ít nhất 3 ký tự" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password phải có ít nhất 6 ký tự" },
        { status: 400 }
      );
    }

    // Check if username exists
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username đã tồn tại" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: "CLIENT",
      },
    });

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    await logAction(user.id, user.username, "REGISTER", "Đăng ký tài khoản mới");

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Lỗi server" },
      { status: 500 }
    );
  }
}
