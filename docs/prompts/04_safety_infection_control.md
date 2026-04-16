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
- output_count: 1200
- category: safety_and_infection_control
- id_prefix: "rn2026_sic"
- id_range: rn2026_sic_0001 ～ rn2026_sic_1200

【如果單次輸出被截斷】
請在截斷處的 JSON 之後直接繼續輸出，保持同一個 questions 陣列，不需重新開頭。
若需要分多次完成，每次請從上次最後一個 id 的下一個繼續，並告知目前已完成的題數。

【題型分配（嚴格執行，共 1200 題）】
- single_best_answer（SBA）：720 題（60%）→ 每題剛好 4 個選項，1 個正確答案
- sata（SATA）：480 題（40%）→ 每題 5 或 6 個選項，2–4 個正確答案
- SATA 正確答案數量分布：2 個正確 × 144 題、3 個正確 × 240 題、4 個正確 × 96 題

【難度分配（嚴格執行）】
- easy：240 題（20%）→ SBA 144 + SATA 96
- medium：720 題（60%）→ SBA 432 + SATA 288
- hard：240 題（20%）→ SBA 144 + SATA 96

【主題內容分配（共 1200 題）】
1. standard precautions / PPE selection（標準防護措施與個人防護裝備選擇）：140 題
2. transmission-based precautions — contact / droplet / airborne（傳播途徑防護）：140 題
3. hand hygiene / surgical asepsis / sterile technique（手部衛生與無菌技術）：140 題
4. fall prevention / safe patient environment（跌倒預防與安全環境）：140 題
5. healthcare-associated infection prevention（醫療相關感染預防）：140 題
6. error reporting / incident management / near-miss（錯誤通報與事故管理）：130 題
7. hazardous materials / safe medication handling（危險物質與藥物安全處置）：100 題
8. emergency preparedness / disaster response（緊急應變準備）：100 題
9. restraint alternatives / least-restrictive safety（約束替代方案）：170 題

【Bloom's 認知層級分配（共 1200 題）】
- understand：144 題（12%）
- apply：336 題（28%）
- analyze：432 題（36%）
- evaluate：288 題（24%）

【CJMM 臨床判斷步驟分配（共 1200 題）】
- recognize_cues：192 題
- analyze_cues：240 題
- prioritize_hypotheses：192 題
- generate_solutions：192 題
- take_action：240 題
- evaluate_outcomes：144 題

【出題品質要求】
1. 每題都要有真實臨床情境（clinical scenario），避免教科書式死背題。
2. single_best_answer 有且只有一個最佳答案，錯誤選項必須具迷惑性。
3. rationale 必須逐選項提供，正確與錯誤原因都要清楚說明。
4. 1200 題中不可重複相同臨床情境，正確答案字母（A/B/C/D）整體分布均勻（各約 300 次）。
5. 隔離種類、PPE 選擇、消毒等級必須符合 CDC 最新標準。
6. SATA 題的正確選項間不可有明顯邏輯重疊。

【語言規範】
- 所有 _zh 欄位使用繁體中文（台灣用語）
- 英文欄位使用 American English，符合 NCLEX-RN 用語
- 藥名優先使用 generic name，括號內可附 brand name

【輸出 JSON schema（嚴格遵守）】
{
  "metadata": {
    "exam": "NCLEX-RN",
    "version": "2026-aligned-original",
    "language": "bilingual_en_zh_tw",
    "category": "safety_and_infection_control",
    "count": 1200,
    "id_prefix": "rn2026_sic",
    "distribution": {
      "sba_count": 720, "sata_count": 480,
      "easy_count": 240, "medium_count": 720, "hard_count": 240
    },
    "source_policy": {
      "allowed_source_family": ["Open RN / WisTech Open Nursing Fundamentals 2e","Open RN / WisTech Open Nursing Skills 2e","Open RN / WisTech Open Nursing Pharmacology 2e","Open RN / WisTech Open Nursing Management and Professional Concepts 2e","Open RN / WisTech Open Nursing Mental Health and Community Concepts 2e","Open RN / WisTech Open Nursing Health Promotion"],
      "license_requirement": "commercially reusable concepts only; create fully original rewritten items",
      "excluded_source_family": ["NCSBN official sample questions","NCLEX official exam preview","non-commercial or all-rights-reserved question banks"]
    }
  },
  "questions": [
    {
      "id": "rn2026_sic_0001",
      "question_type": "single_best_answer",
      "client_needs_category": "safety_and_infection_control",
      "client_needs_subcategory": "standard_precautions",
      "cjmm_step": "take_action",
      "blooms_level": "apply",
      "difficulty": "easy",
      "clinical_scenario_en": "string",
      "clinical_scenario_zh": "string",
      "stem_en": "string",
      "stem_zh": "string",
      "options": [
        {"id": "rn2026_sic_0001_a","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_sic_0001_b","text_en": "string","text_zh": "string","is_correct": true,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_sic_0001_c","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_sic_0001_d","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"}
      ],
      "correct_answer_ids": ["rn2026_sic_0001_b"],
      "answer_summary_en": "string (50–80 words)",
      "answer_summary_zh": "string（50–80 字）",
      "source_basis": {
        "source_family": "Open RN / WisTech Open",
        "source_domain_topic": "safety and infection control / precautions",
        "license_status": "derived from commercially reusable source concepts; item text is fully original"
      }
    }
  ]
}

現在開始生成，直接輸出 JSON，不要有任何前言或說明。
