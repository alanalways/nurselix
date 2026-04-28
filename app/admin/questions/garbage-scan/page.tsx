import { redirect } from "next/navigation";
export default function GarbageScanRedirect() {
  // Garbage scan was the legacy adverb-pollution detector; the new
  // 18-rule scanner lives in the quality tab.
  redirect("/admin/command-center?tab=quality");
}
