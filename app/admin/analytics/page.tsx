import { redirect } from "next/navigation";
export default function AnalyticsRedirect() {
  redirect("/admin/command-center?tab=analytics");
}
