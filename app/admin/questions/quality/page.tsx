import { redirect } from "next/navigation";
export default function QualityRedirect() {
  redirect("/admin/command-center?tab=quality");
}
