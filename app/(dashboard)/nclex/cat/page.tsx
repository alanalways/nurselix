import ExamShell from "@/components/nclex/ExamShell";

export default function CatPage() {
  return (
    <ExamShell
      mode="CAT"
      title="CAT 智能考試"
      showTheta
      showExplanationAfterAnswer={false}
    />
  );
}
