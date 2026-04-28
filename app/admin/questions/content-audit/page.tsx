import { redirect } from "next/navigation";
export default function ContentAuditRedirect() {
  redirect("/admin/command-center?tab=audit");
}
