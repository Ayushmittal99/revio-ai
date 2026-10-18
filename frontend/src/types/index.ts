export type Sentiment = "Positive" | "Neutral" | "Negative";
export type PriorityLevel = "High" | "Medium" | "Low";
export type Tone = "Professional" | "Friendly" | "Empathetic";

export interface PriorityFactor { factor: string; points: number; detail: string }
export interface Review {
  review_id: string; review_text: string; date: string | null; rating: number | null;
  product: string | null; customer: string | null; sentiment: Sentiment; confidence: number | null;
  sentiment_source: "model" | "heuristic"; category: string; category_keywords: string[];
  priority_score: number; priority_level: PriorityLevel; priority_factors: PriorityFactor[];
  safety_flag: boolean; needs_human_review: boolean; priority_explanation: string;
}
export interface Stats {
  imported: number; valid: number; duplicate: number; skipped: number; processed: number;
  warnings: { missing_rating: number; invalid_rating: number; invalid_date: number; id_reassigned: number };
}
export interface Issue { row: number; kind: string; message: string }
export interface SentimentStatus {
  mode: "model" | "heuristic"; model_name: string; fallback_active: boolean; reason: string | null;
  requested_mode: string; note: string;
}
export interface Kpis { total: number; positive_pct: number; negative_pct: number; high_priority: number; needs_human_review: number }
export interface NamedValue { name: string; value: number }
export interface TrendPoint { month: string; Positive: number; Neutral: number; Negative: number }
export interface AttentionItem { review_id: string; review_text: string; priority_score: number; priority_level: PriorityLevel; category: string; safety_flag: boolean }
export interface Summary {
  has_data: boolean; filename?: string; is_demo?: boolean; analyzed_at?: string; stats?: Stats;
  sentiment_engine?: SentimentStatus; kpis?: Kpis; sentiment_distribution?: NamedValue[];
  category_distribution?: NamedValue[]; rating_distribution?: { rating: number; count: number }[];
  missing_rating_count?: number; trend?: TrendPoint[];
  top_negative_theme?: { category: string; count: number } | null;
  top_positive_theme?: { category: string; count: number } | null; attention?: AttentionItem[];
}
export interface AnalyzeResponse {
  filename: string; is_demo: boolean; stats: Stats; issues: Issue[]; sentiment_engine: SentimentStatus; summary: Summary;
}
export interface PreviewResponse {
  columns: string[]; stats: Stats; issues: Issue[]; encoding: string;
  rows: { review_id: string; review_text: string; date: string | null; rating: number | null; product: string | null }[];
}
export interface ReviewList { has_data?: boolean; items: Review[]; total: number; page: number; page_size: number; pages: number }
export interface ReplyDraft {
  review_id: string; tone: Tone; draft: string; source: "template" | "llm"; fallback_reason: string | null;
  requires_human_review: boolean; disclaimer: string; safety_note: string | null;
}
export interface Theme { keyword: string; reviews: number; example: { review_id: string; snippet: string } | null }
export interface Recommendation { category: string; review_ids: string[]; measured: string; suggestion: string }
export interface Insights {
  has_data: boolean; total_reviews?: number; negative_count?: number; positive_count?: number;
  sufficient_for_themes?: boolean; negative_themes?: Theme[]; positive_themes?: Theme[];
  negative_category_counts?: NamedValue[]; category_trend?: Record<string, number | string>[];
  recommendations?: Recommendation[]; note?: string;
}
export interface Health {
  status: string; version: string; sentiment: SentimentStatus; llm: { configured: boolean; enabled: boolean };
  has_dataset: boolean; privacy: string;
}
