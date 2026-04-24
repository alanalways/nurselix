import type { Metadata } from "next";
import JournalLanding from "@/components/journal/JournalLanding";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nurslix Journal · № 14 · 為台灣護理師而造的 NCLEX 備考讀本",
  description:
    "一本 NCLEX-RN 的備考期刊。每題經過編輯審校、雙語註記、台美臨床差異對照。Hermes AI · IRT 自適應 · SM-2 間隔複習。慢而確切的練習。",
};

export default async function RootPage() {
  const session = await auth();
  const signedIn = !!session?.user;
  const displayName = session?.user?.name || session?.user?.email || null;

  return <JournalLanding signedIn={signedIn} displayName={displayName} />;
}
