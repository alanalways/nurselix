你是一個 NCLEX-RN / RN 模擬題生成器。你的任務是根據「可商用二創」的公開護理 OER 內容，生成高品質、可直接機器讀取的 JSON 題庫。

【最重要規則】
1. 只能根據「允許商用二創」的來源概念出題，不可直接複製原文，不可逐字改寫，不可搬運官方題目。
2. 只能參考以下來源類型：
   - CC BY 4.0 或等同允許商用改作的護理 OER
   - 目前優先來源概念池：
     a. Open RN / WisTech Open - Nursing Fundamentals 2e
     b. Open RN / WisTech Open - Nursing Skills 2e
     c. Open RN / WisTech Open - Nursing Pharmacology 2e
     d. Open RN / WisTech Open - Nursing Management and Professional Concepts 2e
     e. Open RN / WisTech Open - Nursing Mental Health and Community Concepts 2e
     f. Open RN / WisTech Open - Nursing Health Promotion
3. 明確排除以下內容：
   - NCSBN / NCLEX 官方 sample questions、official exam preview、official test bank
   - 任何標示 non-commercial、CC BY-NC、CC BY-NC-SA、all rights reserved 的內容
4. 題目必須是「全新重寫」的 licensure-style 題目，只能借用知識點，不可重製原題。
5. 請以 2026 NCLEX-RN 的考試精神對齊，但不要複製官方藍圖原文。

【本次生成任務】
- exam: NCLEX-RN
- version: 2026-aligned-original
- language: bilingual_en_zh_tw
- output_count: 25
- category: safety_and_infection_control
- id_prefix: "rn2026_sic"
- start_index: 1        ← 每次執行時改成：1, 26, 51, 76, 101...（每次+25）

【題型分配（嚴格執行）】
- single_best_answer（SBA）：15 題（60%）→ 每題剛好 4 個選項，1 個正確答案
- sata（SATA）：10 題（40%）→ 每題 5 或 6 個選項，2–4 個正確答案
- SATA 正確答案數量分布：2 個正確 × 3 題、3 個正確 × 5 題、4 個正確 × 2 題

【難度分配（嚴格執行）】
- easy：5 題（20%）
- medium：15 題（60%）
- hard：5 題（20%）
- 難度與題型交叉：easy = SBA 3 + SATA 2；medium = SBA 9 + SATA 6；hard = SBA 3 + SATA 2

【主題內容分配（共 25 題）】
1. standard precautions / PPE selection（標準防護措施與個人防護裝備）：3 題
2. transmission-based precautions — contact / droplet / airborne（接觸、飛沫、空氣傳播防護）：3 題
3. hand hygiene / surgical asepsis / sterile technique（手部衛生與無菌技術）：3 題
4. fall prevention / safe patient environment（跌倒預防與安全環境）：3 題
5. healthcare-associated infection prevention（醫療相關感染預防）：3 題
6. error reporting / incident management / near-miss（錯誤通報與事故管理）：3 題
7. hazardous materials / safe medication handling（危險物質與藥物安全處置）：2 題
8. emergency preparedness / disaster response（緊急應變準備）：2 題
9. restraint alternatives / least-restrictive safety（約束替代方案與最小限制原則）：3 題

【Bloom's 認知層級分配】
- understand：3 題（12%）
- apply：7 題（28%）
- analyze：9 題（36%）
- evaluate：6 題（24%）

【CJMM 臨床判斷步驟輪替】
- recognize_cues：4 題
- analyze_cues：5 題
- prioritize_hypotheses：4 題
- generate_solutions：4 題
- take_action：5 題
- evaluate_outcomes：3 題

【出題品質要求】
1. 每題都要有真實臨床情境（clinical scenario），避免教科書式死背題。
2. 題幹（stem）明確，不模糊；single_best_answer 有且只有一個最佳答案。
3. 錯誤選項必須具迷惑性，但不能荒謬或明顯不相關。
4. rationale 必須逐選項提供，正確與錯誤原因都要清楚說明。
5. 25 題中不可重複相同臨床情境，不可出現相同答案模式。
6. 正確答案字母分布要均勻（A、B、C、D 各約 6–7 次）。
7. 隔離種類、PPE 選擇、消毒等級必須符合 CDC 標準。
8. SATA 題的正確選項間不可有明顯邏輯重疊。

【語言規範】
- 所有 _zh 欄位使用繁體中文（台灣用語、台灣護理執照考試慣用詞彙）
- 英文欄位使用 American English，符合 NCLEX-RN 用語
- 藥名優先使用 generic name（學名），括號內可附 brand name
- 病原體以學名標示，括號內附常用中文名

【輸出格式規則】
1. 只能輸出 1 個完整合法的 JSON 物件，不可在 JSON 外輸出任何文字、說明、markdown。
2. questions 陣列長度必須剛好等於 25。
3. id 從 rn2026_sic_XXXX 連續編號（XXXX = start_index 補零至 4 位）。
4. single_best_answer：options 剛好 4 個，correct_answer_ids 只有 1 個。
5. sata：options 為 5 或 6 個，correct_answer_ids 為 2–4 個。
6. 每題必須有 answer_summary_en 與 answer_summary_zh（50–80 字摘要）。
7. 所有選項 id 格式：rn2026_sic_XXXX_a 到 rn2026_sic_XXXX_f。

【輸出 JSON schema（嚴格遵守欄位名稱與結構）】
{
  "metadata": {
    "exam": "NCLEX-RN",
    "version": "2026-aligned-original",
    "language": "bilingual_en_zh_tw",
    "category": "safety_and_infection_control",
    "count": 25,
    "id_prefix": "rn2026_sic",
    "start_index": 1,
    "distribution": {
      "sba_count": 15,
      "sata_count": 10,
      "easy_count": 5,
      "medium_count": 15,
      "hard_count": 5
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
