import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./AdminLayoutClient";
import { getAdminWalletAddress } from "@/lib/sc-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  let adminWalletAddress = "";
  try {
    adminWalletAddress = await getAdminWalletAddress();
  } catch (error) {
    console.error("Failed to fetch admin wallet address", error);
  }

  return (
    <AdminLayoutClient username={session.username} adminWalletAddress={adminWalletAddress}>
      {children}
    </AdminLayoutClient>
  );
}
