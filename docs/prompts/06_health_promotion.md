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
- output_count: 900
- category: health_promotion_and_maintenance
- id_prefix: "rn2026_hp"
- id_range: rn2026_hp_0001 ～ rn2026_hp_0900

【如果單次輸出被截斷】
請在截斷處的 JSON 之後直接繼續輸出，保持同一個 questions 陣列，不需重新開頭。
若需要分多次完成，每次請從上次最後一個 id 的下一個繼續，並告知目前已完成的題數。

【題型分配（嚴格執行，共 900 題）】
- single_best_answer（SBA）：540 題（60%）→ 每題剛好 4 個選項，1 個正確答案
- sata（SATA）：360 題（40%）→ 每題 5 或 6 個選項，2–4 個正確答案
- SATA 正確答案數量分布：2 個正確 × 108 題、3 個正確 × 180 題、4 個正確 × 72 題

【難度分配（嚴格執行）】
- easy：180 題（20%）→ SBA 108 + SATA 72
- medium：540 題（60%）→ SBA 324 + SATA 216
- hard：180 題（20%）→ SBA 108 + SATA 72

【主題內容分配（共 900 題，每題各 100 題）】
1. cancer and cardiovascular screening programs（癌症與心血管篩檢計畫）：100 題
2. immunization schedules and vaccine education（疫苗接種時程與衛教）：100 題
3. patient and family health education techniques（病人與家屬健康教育技巧）：100 題
4. developmental stages and age-appropriate teaching（發展階段與年齡適當衛教）：100 題
5. lifestyle modification — diet, exercise, smoking cessation（生活型態調整）：100 題
6. prenatal and postnatal care（產前與產後照護）：100 題
7. chronic disease prevention and self-management（慢性病預防與自我管理）：100 題
8. community resources and referral（社區資源與轉介）：100 題
9. health disparities and cultural considerations（健康不平等與文化考量）：100 題

【Bloom's 認知層級分配（共 900 題）】
- understand：108 題（12%）
- apply：252 題（28%）
- analyze：324 題（36%）
- evaluate：216 題（24%）

【CJMM 臨床判斷步驟分配（共 900 題）】
- recognize_cues：144 題
- analyze_cues：180 題
- prioritize_hypotheses：144 題
- generate_solutions：144 題
- take_action：180 題
- evaluate_outcomes：108 題

【出題品質要求】
1. 每題都要有真實臨床情境（clinical scenario），避免教科書式死背題。
2. single_best_answer 有且只有一個最佳答案，錯誤選項必須具迷惑性。
3. rationale 必須逐選項提供，正確與錯誤原因都要清楚說明。
4. 900 題中不可重複相同臨床情境，正確答案字母（A/B/C/D）整體分布均勻（各約 225 次）。
5. 疫苗建議、篩檢年齡、發展里程碑必須符合 USPTF / CDC 當前指引。
6. SATA 題的正確選項間不可有明顯邏輯重疊。

【語言規範】
- 所有 _zh 欄位使用繁體中文（台灣用語）
- 英文欄位使用 American English，符合 NCLEX-RN 用語
- 疫苗以全名標示並附縮寫（如 influenza vaccine, MMR, DTaP）

【輸出 JSON schema（嚴格遵守）】
{
  "metadata": {
    "exam": "NCLEX-RN",
    "version": "2026-aligned-original",
    "language": "bilingual_en_zh_tw",
    "category": "health_promotion_and_maintenance",
    "count": 900,
    "id_prefix": "rn2026_hp",
    "distribution": {
      "sba_count": 540, "sata_count": 360,
      "easy_count": 180, "medium_count": 540, "hard_count": 180
    },
    "source_policy": {
      "allowed_source_family": ["Open RN / WisTech Open Nursing Fundamentals 2e","Open RN / WisTech Open Nursing Skills 2e","Open RN / WisTech Open Nursing Pharmacology 2e","Open RN / WisTech Open Nursing Management and Professional Concepts 2e","Open RN / WisTech Open Nursing Mental Health and Community Concepts 2e","Open RN / WisTech Open Nursing Health Promotion"],
      "license_requirement": "commercially reusable concepts only; create fully original rewritten items",
      "excluded_source_family": ["NCSBN official sample questions","NCLEX official exam preview","non-commercial or all-rights-reserved question banks"]
    }
  },
  "questions": [
    {
      "id": "rn2026_hp_0001",
      "question_type": "single_best_answer",
      "client_needs_category": "health_promotion_and_maintenance",
      "client_needs_subcategory": "health_screening",
      "cjmm_step": "generate_solutions",
      "blooms_level": "apply",
      "difficulty": "easy",
      "clinical_scenario_en": "string",
      "clinical_scenario_zh": "string",
      "stem_en": "string",
      "stem_zh": "string",
      "options": [
        {"id": "rn2026_hp_0001_a","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_hp_0001_b","text_en": "string","text_zh": "string","is_correct": true,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_hp_0001_c","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_hp_0001_d","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"}
      ],
      "correct_answer_ids": ["rn2026_hp_0001_b"],
      "answer_summary_en": "string (50–80 words)",
      "answer_summary_zh": "string（50–80 字）",
      "source_basis": {
        "source_family": "Open RN / WisTech Open",
        "source_domain_topic": "health promotion / screening",
        "license_status": "derived from commercially reusable source concepts; item text is fully original"
      }
    }
  ]
}

現在開始生成，直接輸出 JSON，不要有任何前言或說明。
