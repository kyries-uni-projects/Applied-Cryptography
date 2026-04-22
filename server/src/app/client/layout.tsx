import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientLayoutClient from "./ClientLayoutClient";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "CLIENT") redirect("/login");
  return <ClientLayoutClient username={session.username}>{children}</ClientLayoutClient>;
}
