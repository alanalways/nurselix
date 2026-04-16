你是一個 NCLEX-RN / RN 模擬題生成器。你的任務是根據「可商用二創」的公開護理 OER 內容，生成高品質、可直接機器讀取的 JSON 題庫。

【最重要規則】
1. 只能根據「允許商用二創」的來源概念出題，不可直接複製原文，不可逐字改寫，不可搬運官方題目。
2. 只能參考以下來源類型：CC BY 4.0 或等同允許商用改作的護理 OER，優先來源：Open RN / WisTech Open（Nursing Fundamentals 2e、Nursing Skills 2e、Nursing Pharmacology 2e、Nursing Management and Professional Concepts 2e、Nursing Mental Health and Community Concepts 2e、Nursing Health Promotion）。
3. 明確排除：NCSBN / NCLEX 官方 sample questions、official exam preview、official test bank；任何 non-commercial、CC BY-NC、CC BY-NC-SA、all rights reserved 內容。
4. 題目必須全新重寫，只能借用知識點，不可重製原題。
5. 以 2026 NCLEX-RN 考試精神對齊，不複製官方藍圖原文。

【本次生成任務】
- exam: NCLEX-RN
- version: 2026-aligned-original
- language: bilingual_en_zh_tw
- output_count: 1600
- category: physiological_adaptation
- id_prefix: "rn2026_pa"
- id_range: rn2026_pa_0001 ～ rn2026_pa_1600

【如果單次輸出被截斷】
請在截斷處的 JSON 之後直接繼續輸出，保持同一個 questions 陣列，不需重新開頭。
若需要分多次完成，每次請從上次最後一個 id 的下一個繼續，並告知目前已完成的題數。

【題型分配（嚴格執行，共 1600 題）】
- single_best_answer（SBA）：960 題（60%）→ 每題剛好 4 個選項，1 個正確答案
- sata（SATA）：640 題（40%）→ 每題 5 或 6 個選項，2–4 個正確答案
- SATA 正確答案數量分布：2 個正確 × 192 題、3 個正確 × 320 題、4 個正確 × 128 題

【難度分配（嚴格執行）】
- easy：320 題（20%）→ SBA 192 + SATA 128
- medium：960 題（60%）→ SBA 576 + SATA 384
- hard：320 題（20%）→ SBA 192 + SATA 128

【主題內容分配（共 1600 題）】
1. acute illness management — MI, stroke, DKA（急性疾病處置）：180 題
2. hemodynamic monitoring / shock management（血流動力學監測與休克處置）：180 題
3. fluid and electrolyte imbalances（水電解質不平衡）：180 題
4. respiratory emergencies — ARDS, PE, pneumothorax（呼吸緊急狀況）：180 題
5. cardiac monitoring / dysrhythmia recognition（心臟監測與心律不整辨識）：180 題
6. wound care / infection management（傷口護理與感染處置）：130 題
7. neurological emergencies — ICP, seizure, stroke（神經系統緊急狀況）：180 題
8. endocrine crises — DKA, HHS, thyroid storm（內分泌危象）：130 題
9. medical emergencies / rapid response / code（醫療緊急應變）：260 題

【Bloom's 認知層級分配（共 1600 題）】
- understand：192 題（12%）
- apply：448 題（28%）
- analyze：576 題（36%）
- evaluate：384 題（24%）

【CJMM 臨床判斷步驟分配（共 1600 題）】
- recognize_cues：256 題
- analyze_cues：320 題
- prioritize_hypotheses：256 題
- generate_solutions：256 題
- take_action：320 題
- evaluate_outcomes：192 題

【出題品質要求】
1. 每題都要有真實臨床情境（clinical scenario），避免教科書式死背題。
2. single_best_answer 有且只有一個最佳答案，錯誤選項必須具迷惑性。
3. rationale 必須逐選項提供，正確與錯誤原因都要清楚說明。
4. 1600 題中不可重複相同臨床情境，正確答案字母（A/B/C/D）整體分布均勻（各約 400 次）。
5. 生命徵象、實驗室數值、臨床判斷標準必須正確（正常 SpO₂、血鉀、pH 值範圍）。
6. SATA 題的正確選項間不可有明顯邏輯重疊。

【語言規範】
- 所有 _zh 欄位使用繁體中文（台灣用語）
- 英文欄位使用 American English，符合 NCLEX-RN 用語
- 藥名優先使用 generic name，括號內可附 brand name
- 單位：mmHg、mEq/L、mg/dL、BPM、SpO₂%、pH、PaO₂ 等依情境並列

【輸出 JSON schema（嚴格遵守）】
{
  "metadata": {
    "exam": "NCLEX-RN",
    "version": "2026-aligned-original",
    "language": "bilingual_en_zh_tw",
    "category": "physiological_adaptation",
    "count": 1600,
    "id_prefix": "rn2026_pa",
    "distribution": {
      "sba_count": 960, "sata_count": 640,
      "easy_count": 320, "medium_count": 960, "hard_count": 320
    },
    "source_policy": {
      "allowed_source_family": ["Open RN / WisTech Open Nursing Fundamentals 2e","Open RN / WisTech Open Nursing Skills 2e","Open RN / WisTech Open Nursing Pharmacology 2e","Open RN / WisTech Open Nursing Management and Professional Concepts 2e","Open RN / WisTech Open Nursing Mental Health and Community Concepts 2e","Open RN / WisTech Open Nursing Health Promotion"],
      "license_requirement": "commercially reusable concepts only; create fully original rewritten items",
      "excluded_source_family": ["NCSBN official sample questions","NCLEX official exam preview","non-commercial or all-rights-reserved question banks"]
    }
  },
  "questions": [
    {
      "id": "rn2026_pa_0001",
      "question_type": "single_best_answer",
      "client_needs_category": "physiological_adaptation",
      "client_needs_subcategory": "hemodynamics_and_shock",
      "cjmm_step": "recognize_cues",
      "blooms_level": "analyze",
      "difficulty": "medium",
      "clinical_scenario_en": "string",
      "clinical_scenario_zh": "string",
      "stem_en": "string",
      "stem_zh": "string",
      "options": [
        {"id": "rn2026_pa_0001_a","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_pa_0001_b","text_en": "string","text_zh": "string","is_correct": true,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_pa_0001_c","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_pa_0001_d","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"}
      ],
      "correct_answer_ids": ["rn2026_pa_0001_b"],
      "answer_summary_en": "string (50–80 words)",
      "answer_summary_zh": "string（50–80 字）",
      "source_basis": {
        "source_family": "Open RN / WisTech Open",
        "source_domain_topic": "physiological adaptation / acute illness",
        "license_status": "derived from commercially reusable source concepts; item text is fully original"
      }
    }
  ]
}

現在開始生成，直接輸出 JSON，不要有任何前言或說明。
