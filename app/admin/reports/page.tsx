import { redirect } from "next/navigation";
export default function ReportsRedirect() {
  redirect("/admin/command-center?tab=reports");
}
