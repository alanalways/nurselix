"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const domains = ["Management of Care", "Safety & Infection Control", "Health Promotion & Maintenance", "Psychosocial Integrity", "Basic Care & Comfort", "Pharmacological & Parenteral", "Reduction of Risk Potential", "Physiological Adaptation"];

export default function NewQuestionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); router.push("/admin/questions"); }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-4xl space-y-6"
    >
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">新增題目</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Question Content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)]">題目內容（英文）</h2>
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2">題幹 (Stem) *</label>
              <textarea
                rows={4}
                placeholder="A XX-year-old client with... The nurse should..."
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--gold)] text-sm resize-none"
              />
            </div>
            {["A", "B", "C", "D"].map((opt) => (
              <Input key={opt} label={`選項 ${opt} *`} placeholder={`Option ${opt}...`} />
            ))}
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2">正確答案 *</label>
              <div className="flex gap-2">
                {["A", "B", "C", "D"].map((opt) => (
                  <button key={opt} className="flex-1 py-2 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:border-[var(--success)] hover:text-[var(--success)] transition-colors">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)]">解析</h2>
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2">中文解析 * （300 字以上）</label>
              <textarea
                rows={6}
                placeholder="詳細解析正確答案的原因，以及其他三個選項錯誤的原因..."
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--gold)] text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2">台美差異說明（選填）</label>
              <textarea
                rows={3}
                placeholder="如果此題涉及台美做法不同，請說明差異..."
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--gold)] text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Metadata */}
        <div className="space-y-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)]">分類設定</h2>
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2">Domain *</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--gold)] text-sm">
                {domains.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2">難易度 *</label>
              <div className="flex gap-2">
                {["EASY", "MEDIUM", "HARD"].map((d) => (
                  <button key={d} className="flex-1 py-2 rounded-xl border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:border-[var(--gold)] transition-colors">
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-[var(--text-secondary)] block mb-2">題型</label>
              <select className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] outline-none focus:border-[var(--gold)] text-sm">
                {["MCQ", "SATA", "Dropdown", "Matrix", "Bowtie", "Ordered"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-[var(--text-primary)]">IRT 參數（選填）</h2>
            <Input label="鑑別度 a (0.5–2.0)" placeholder="1.0" type="number" />
            <Input label="難度 b (-3.0–3.0)" placeholder="0.0" type="number" />
            <Input label="猜測 c (0.10–0.25)" placeholder="0.15" type="number" />
          </div>

          <Button fullWidth loading={saving} onClick={handleSave}>
            <Save size={14} /> 儲存題目（草稿）
          </Button>
          <Button fullWidth variant="outline" onClick={handleSave}>
            儲存並送審
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
