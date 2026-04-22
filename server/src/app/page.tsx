import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  
  if (session) {
    if (session.role === "ADMIN") {
      redirect("/admin/dashboard");
    } else {
      redirect("/client/dashboard");
    }
  }
  
  redirect("/login");
}
