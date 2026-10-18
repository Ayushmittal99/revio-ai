import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "../App";

export const SUMMARY = {
  has_data: true, filename: "sample_reviews.csv (synthetic demo data)", is_demo: true,
  stats: { imported: 30, valid: 29, duplicate: 1, skipped: 1, processed: 28, warnings: { missing_rating: 2, invalid_rating: 0, invalid_date: 1, id_reassigned: 0 } },
  kpis: { total: 28, positive_pct: 39.3, negative_pct: 46.4, high_priority: 6, needs_human_review: 6 },
  sentiment_distribution: [{ name: "Positive", value: 11 }, { name: "Neutral", value: 4 }, { name: "Negative", value: 13 }],
  category_distribution: [{ name: "Delivery", value: 4 }], rating_distribution: [], trend: [],
  top_negative_theme: { category: "Product Quality", count: 7 }, top_positive_theme: { category: "User Experience", count: 3 }, attention: [],
};
export const REVIEW = { review_id: "R001", review_text: "Great product", date: "2026-07-03", rating: 5, product: "X", customer: null, sentiment: "Positive", confidence: null, sentiment_source: "heuristic", category: "Other", category_keywords: [], priority_score: 0, priority_level: "Low", priority_factors: [], safety_flag: false, needs_human_review: false, priority_explanation: "" };
export const HEALTH = { status: "ok", version: "0.1.0", sentiment: { mode: "heuristic", model_name: "m", fallback_active: true, reason: "offline", requested_mode: "heuristic", note: "n" }, llm: { configured: false, enabled: false }, has_dataset: true, privacy: "" };

export type Handler = (url: string, init?: RequestInit) => unknown;
export function mockFetch(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const body = handler(String(url), init);
    if (body instanceof Error) throw body;
    const status = (body as { __status?: number })?.__status ?? 200;
    return { ok: status < 400, status, json: async () => body } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
export const renderApp = (path = "/") => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
