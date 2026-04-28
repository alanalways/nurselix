import { redirect } from "next/navigation";
export default function LiveRedirect() {
  redirect("/admin/command-center?tab=overview");
}
