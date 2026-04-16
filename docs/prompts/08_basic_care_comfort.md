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
- output_count: 800
- category: basic_care_and_comfort
- id_prefix: "rn2026_bcc"
- id_range: rn2026_bcc_0001 ～ rn2026_bcc_0800

【如果單次輸出被截斷】
請在截斷處的 JSON 之後直接繼續輸出，保持同一個 questions 陣列，不需重新開頭。
若需要分多次完成，每次請從上次最後一個 id 的下一個繼續，並告知目前已完成的題數。

【題型分配（嚴格執行，共 800 題）】
- single_best_answer（SBA）：480 題（60%）→ 每題剛好 4 個選項，1 個正確答案
- sata（SATA）：320 題（40%）→ 每題 5 或 6 個選項，2–4 個正確答案
- SATA 正確答案數量分布：2 個正確 × 96 題、3 個正確 × 160 題、4 個正確 × 64 題

【難度分配（嚴格執行）】
- easy：160 題（20%）→ SBA 96 + SATA 64
- medium：480 題（60%）→ SBA 288 + SATA 192
- hard：160 題（20%）→ SBA 96 + SATA 64

【主題內容分配（共 800 題）】
1. personal hygiene and ADL assistance（個人衛生與日常生活活動協助）：90 題
2. mobility, positioning, and safe transfer（活動度、擺位與安全移位）：90 題
3. nutrition, hydration, and enteral feeding（營養、水分補充與管灌餵食）：90 題
4. elimination — bowel and bladder management（排泄管理：腸道與膀胱）：90 題
5. pain assessment and non-pharmacologic management（疼痛評估與非藥物處置）：90 題
6. rest, sleep, and comfort promotion（休息、睡眠與舒適促進）：80 題
7. assistive devices and adaptive equipment（輔助器具與適應性設備）：80 題
8. palliative and end-of-life comfort care（安寧與臨終舒適照護）：90 題
9. skin integrity and pressure injury prevention（皮膚完整性與壓力性損傷預防）：100 題

【Bloom's 認知層級分配（共 800 題）】
- understand：96 題（12%）
- apply：224 題（28%）
- analyze：288 題（36%）
- evaluate：192 題（24%）

【CJMM 臨床判斷步驟分配（共 800 題）】
- recognize_cues：128 題
- analyze_cues：160 題
- prioritize_hypotheses：128 題
- generate_solutions：128 題
- take_action：160 題
- evaluate_outcomes：96 題

【出題品質要求】
1. 每題都要有真實臨床情境（clinical scenario），避免教科書式死背題。
2. single_best_answer 有且只有一個最佳答案，錯誤選項必須具迷惑性。
3. rationale 必須逐選項提供，正確與錯誤原因都要清楚說明。
4. 800 題中不可重複相同臨床情境，正確答案字母（A/B/C/D）整體分布均勻（各約 200 次）。
5. Braden Scale、疼痛量表（NRS、FLACC）等評估工具分數解讀必須正確。
6. 鼻胃管、導尿管、造口等照護步驟必須符合臨床標準流程。
7. SATA 題的正確選項間不可有明顯邏輯重疊。

【語言規範】
- 所有 _zh 欄位使用繁體中文（台灣用語）
- 英文欄位使用 American English，符合 NCLEX-RN 用語
- 解剖位置以專業術語標示（如 sacral, trochanter）並附中文

【輸出 JSON schema（嚴格遵守）】
{
  "metadata": {
    "exam": "NCLEX-RN",
    "version": "2026-aligned-original",
    "language": "bilingual_en_zh_tw",
    "category": "basic_care_and_comfort",
    "count": 800,
    "id_prefix": "rn2026_bcc",
    "distribution": {
      "sba_count": 480, "sata_count": 320,
      "easy_count": 160, "medium_count": 480, "hard_count": 160
    },
    "source_policy": {
      "allowed_source_family": ["Open RN / WisTech Open Nursing Fundamentals 2e","Open RN / WisTech Open Nursing Skills 2e","Open RN / WisTech Open Nursing Pharmacology 2e","Open RN / WisTech Open Nursing Management and Professional Concepts 2e","Open RN / WisTech Open Nursing Mental Health and Community Concepts 2e","Open RN / WisTech Open Nursing Health Promotion"],
      "license_requirement": "commercially reusable concepts only; create fully original rewritten items",
      "excluded_source_family": ["NCSBN official sample questions","NCLEX official exam preview","non-commercial or all-rights-reserved question banks"]
    }
  },
  "questions": [
    {
      "id": "rn2026_bcc_0001",
      "question_type": "single_best_answer",
      "client_needs_category": "basic_care_and_comfort",
      "client_needs_subcategory": "mobility_and_positioning",
      "cjmm_step": "take_action",
      "blooms_level": "apply",
      "difficulty": "easy",
      "clinical_scenario_en": "string",
      "clinical_scenario_zh": "string",
      "stem_en": "string",
      "stem_zh": "string",
      "options": [
        {"id": "rn2026_bcc_0001_a","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_bcc_0001_b","text_en": "string","text_zh": "string","is_correct": true,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_bcc_0001_c","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"},
        {"id": "rn2026_bcc_0001_d","text_en": "string","text_zh": "string","is_correct": false,"rationale_en": "string","rationale_zh": "string"}
      ],
      "correct_answer_ids": ["rn2026_bcc_0001_b"],
      "answer_summary_en": "string (50–80 words)",
      "answer_summary_zh": "string（50–80 字）",
      "source_basis": {
        "source_family": "Open RN / WisTech Open",
        "source_domain_topic": "basic care and comfort / mobility",
        "license_status": "derived from commercially reusable source concepts; item text is fully original"
      }
    }
  ]
}

現在開始生成，直接輸出 JSON，不要有任何前言或說明。
