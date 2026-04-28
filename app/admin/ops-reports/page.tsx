import { redirect } from "next/navigation";
export default function OpsReportsRedirect() {
  redirect("/admin/command-center?tab=agents");
}
