import type { AnalyzeResponse, Health, Insights, PreviewResponse, ReplyDraft, Review, ReviewList, Summary, Tone } from "../types";

export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status = 0, public code = "network_error") { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(`Cannot reach the backend at ${API_BASE}. Is it running?`);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status}).`, code = "http_error";
    try {
      const body = await res.json();
      if (body?.error) { message = body.error.message; code = body.error.code; }
    } catch { /* non-JSON error body */ }
    throw new ApiError(message, res.status, code);
  }
  return (await res.json()) as T;
}

const upload = (file: File) => { const f = new FormData(); f.append("file", file); return { method: "POST", body: f } as RequestInit; };

export const api = {
  health: () => request<Health>("/health"),
  preview: (file: File) => request<PreviewResponse>("/api/reviews/preview", upload(file)),
  analyze: (file: File) => request<AnalyzeResponse>("/api/reviews/analyze", upload(file)),
  analyzeSample: () => request<AnalyzeResponse>("/api/reviews/analyze-sample", { method: "POST" }),
  summary: () => request<Summary>("/api/summary"),
  reviews: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request<ReviewList>(`/api/reviews?${qs.toString()}`);
  },
  review: (id: string) => request<Review>(`/api/reviews/${encodeURIComponent(id)}`),
  reply: (id: string, tone: Tone, variant: number) =>
    request<ReplyDraft>(`/api/reviews/${encodeURIComponent(id)}/reply`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tone, variant }),
    }),
  insights: () => request<Insights>("/api/insights"),
  clear: () => request<{ cleared: boolean }>("/api/reviews", { method: "DELETE" }),
  exportUrl: () => `${API_BASE}/api/reviews/export`,
  sampleUrl: () => `${API_BASE}/api/sample-csv`,
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
