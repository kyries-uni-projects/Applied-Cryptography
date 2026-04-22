import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function GET() {
  try {
    const config = await prisma.caConfig.findFirst();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Get config error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const username = request.headers.get("x-username") || "admin";
    const { algorithm, hashAlgorithm, keyLength, validityDays } = await request.json();

    const config = await prisma.caConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const updated = await prisma.caConfig.update({
      where: { id: config.id },
      data: { algorithm, hashAlgorithm, keyLength, validityDays },
    });

    await logAction(userId, username, "UPDATE_CA_CONFIG", `Cập nhật cấu hình CA: ${algorithm}, ${hashAlgorithm}, ${keyLength}bit, ${validityDays} ngày`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update config error:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
