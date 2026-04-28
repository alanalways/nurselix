import { redirect } from "next/navigation";
export default function SpotCheckRedirect() {
  redirect("/admin/command-center?tab=spot-check");
}
