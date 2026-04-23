-- Normalize domain name: "Pharmacological and Parenteral Therapies" → "Pharmacological & Parenteral"
-- This fixes questions imported before the canonical short-form was enforced.
UPDATE "Question"
SET domain = 'Pharmacological & Parenteral'
WHERE domain = 'Pharmacological and Parenteral Therapies';
