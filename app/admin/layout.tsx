import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminLayoutClient from "./layout.client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <AdminLayoutClient email={session.user.email ?? ""}>{children}</AdminLayoutClient>;
}
