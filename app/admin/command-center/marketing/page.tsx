import { redirect } from "next/navigation";

export default function MarketingPageRedirect() {
  redirect("/admin/command-center?tab=marketing");
}
