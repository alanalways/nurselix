import { redirect } from "next/navigation";
export default function ToeicRedirect() {
  redirect("/admin/command-center?tab=toeic");
}
