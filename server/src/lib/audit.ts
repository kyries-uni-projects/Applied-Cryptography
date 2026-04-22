import { prisma } from "./db";

export async function logAction(
  userId: string | null,
  username: string,
  action: string,
  details: string,
  ipAddress?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      username,
      action,
      details,
      ipAddress: ipAddress || "unknown",
    },
  });
}
