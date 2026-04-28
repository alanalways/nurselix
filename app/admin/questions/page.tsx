import { redirect } from "next/navigation";
export default function QuestionsRedirect() {
  // Question list / management consolidated into command-center.
  // The /admin/questions/[id] detail editor is preserved.
  redirect("/admin/command-center?tab=overview");
}
