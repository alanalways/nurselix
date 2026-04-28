import { redirect } from "next/navigation";
export default function AgentsRedirect() {
  redirect("/admin/command-center?tab=agents");
}
