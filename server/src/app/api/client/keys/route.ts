import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateKeyPair } from "@/lib/crypto";
import { logAction } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id")!;
  const keys = await prisma.keyPair.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(keys);
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")!;
    const username = request.headers.get("x-username") || "unknown";
    const { label, keyLength } = await request.json();

    if (!label) return NextResponse.json({ error: "Label là bắt buộc" }, { status: 400 });

    const keys = generateKeyPair(keyLength || 2048);
    const keyPair = await prisma.keyPair.create({
      data: { userId, label, publicKeyPem: keys.publicKeyPem, privateKeyPem: keys.privateKeyPem, keyLength: keyLength || 2048 },
    });

    await logAction(userId, username, "GENERATE_KEYPAIR", `Tạo cặp khóa "${label}" (${keyLength || 2048} bits)`);
    return NextResponse.json(keyPair);
  } catch (error) {
    console.error("Generate key error:", error);
    return NextResponse.json({ error: "Lỗi tạo khóa" }, { status: 500 });
  }
}
