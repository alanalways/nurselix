import { redirect } from "next/navigation";
export default function UpgradeRequestsRedirect() {
  redirect("/admin/command-center?tab=users");
}
