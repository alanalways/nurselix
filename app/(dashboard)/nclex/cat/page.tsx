import SessionStarter from "@/components/nclex/SessionStarter";

export default function CatPage() {
  return (
    <SessionStarter
      mode="CAT"
      title="CAT 智能考試"
      showTheta
      showCountdown
    />
  );
}
