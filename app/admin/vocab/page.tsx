import { redirect } from "next/navigation";
export default function VocabRedirect() {
  redirect("/admin/command-center?tab=vocab");
}
