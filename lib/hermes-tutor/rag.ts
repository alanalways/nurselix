/**
 * Retrieve the top-K most similar Questions to a given query embedding.
 *
 * CTE-cosine fallback variant: pgvector is unavailable on the Zeabur PG
 * image, so embeddings live as JSONB (768-element float array). We compute
 * cosine similarity in pure SQL inside a single-pass query that:
 *   1. unnests both vectors with WITH ORDINALITY so positions align
 *   2. sums the elementwise product (dot product) per question
 *   3. divides by the product of the two L2 norms
 *
 * Performance note: 14k rows × 768 dims ≈ 10.7M float ops per query.
 * On a warm Postgres connection this runs in ~100-300ms — slower than HNSW
 * but well below the 800ms-2s LLM step that always follows.
 */
import { prisma } from "@/lib/prisma";
import { embed } from "./embedding";

export interface RagHit {
  questionId: string;
  stem: string;
  stemZh: string | null;
  explanationZh: string | null;
  domain: string | null;
  /** 0 = identical, 2 = opposite. Lower is better. */
  distance: number;
}

interface RagRow {
  questionId: string;
  stem: string;
  stemZh: string | null;
  explanationZh: string | null;
  domain: string | null;
  distance: number | string;
}

/**
 * Retrieve top-K similar questions, optionally excluding one id (so the
 * active question doesn't dominate the retrieval).
 */
export async function retrieveSimilar(
  query: string,
  opts: { k?: number; excludeQuestionId?: string } = {}
): Promise<RagHit[]> {
  const { k = 3, excludeQuestionId } = opts;
  const vec = await embed(query, { taskType: "RETRIEVAL_QUERY" });

  // Pre-compute query L2 norm in JS so the SQL only handles per-row work.
  let queryNormSq = 0;
  for (let i = 0; i < vec.length; i++) queryNormSq += vec[i] * vec[i];
  const queryNorm = Math.sqrt(queryNormSq);
  if (queryNorm === 0) return [];

  // We pass the query vector as JSONB (parameter binding handles escaping).
  const queryJson = JSON.stringify(vec);
  const params: unknown[] = [queryJson, queryNorm];
  let excludeClause = ``;
  if (excludeQuestionId) {
    params.push(excludeQuestionId);
    excludeClause = `AND e."questionId" <> $3`;
  }
  const sql = `
    WITH q_vec AS (
      SELECT v.val AS x, v.ord AS i
      FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS v(val, ord)
    )
    SELECT e."questionId" AS "questionId",
           q.stem,
           q."stemZh"        AS "stemZh",
           q."explanationZh" AS "explanationZh",
           q.domain,
           1 - (
             SELECT SUM((qe.val::float8) * (qv.x::float8)) /
                    (SQRT(SUM((qe.val::float8) * (qe.val::float8))) * $2::float8)
             FROM jsonb_array_elements_text(e.embedding) WITH ORDINALITY AS qe(val, ord)
             JOIN q_vec qv ON qv.i = qe.ord
           ) AS distance
    FROM "QuestionEmbedding" e
    JOIN "Question" q ON q.id = e."questionId"
    WHERE q.module = 'NCLEX' AND q.status = 'APPROVED' ${excludeClause}
    ORDER BY distance ASC
    LIMIT ${k};
  `;
  const rows = await prisma.$queryRawUnsafe<RagRow[]>(sql, ...params);
  return rows.map((r) => ({
    questionId: r.questionId,
    stem: r.stem,
    stemZh: r.stemZh,
    explanationZh: r.explanationZh,
    domain: r.domain,
    distance: typeof r.distance === "string" ? parseFloat(r.distance) : r.distance,
  }));
}
