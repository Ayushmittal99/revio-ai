import { Download, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReplyPanel from "../components/ReplyPanel";
import { Badge, Button, Card, Empty, ErrorBox, LinkButtonClass, PriorityBadge, SentimentBadge, Spinner, trunc } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import type { Review, ReviewList } from "../types";

const CATS = ["Product Quality", "Delivery", "Pricing", "Customer Support", "User Experience", "Refunds and Returns", "Other"];
const INIT = { q: "", sentiment: "", category: "", priority: "", min_rating: "", max_rating: "", sort: "priority_score", order: "desc", page: 1 };
const sel = "rounded-lg border border-line bg-surface2 px-2 py-1.5 text-sm";

function Drawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [r, setR] = useState<Review | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setR(null); setErr(null); api.review(id).then(setR).catch((e) => setErr(errorMessage(e))); }, [id]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <aside role="dialog" aria-label="Review details" className="h-full w-full max-w-lg space-y-4 overflow-y-auto border-l border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Review {id}</h2><button aria-label="Close details" onClick={onClose}><X className="h-5 w-5" /></button></div>
        {err && <ErrorBox message={err} />}{!r && !err && <Spinner />}
        {r && (<>
          <p className="text-sm leading-relaxed">{r.review_text}</p>
          <div className="flex flex-wrap gap-2"><SentimentBadge value={r.sentiment} /><PriorityBadge level={r.priority_level} score={r.priority_score} /><Badge>{r.category}</Badge>
            {r.needs_human_review && <Badge tone="red">Needs human review</Badge>}</div>
          <p className="text-xs text-muted">{r.date ?? "No date"} · {r.rating !== null ? `${r.rating}/5` : "No rating"} · {r.product ?? "No product"}</p>
          <Card title="Classification">
            <p className="text-xs text-muted">Sentiment source: {r.sentiment_source === "model" ? `pretrained model, confidence ${r.confidence}` : "heuristic fallback (no confidence available)"}.</p>
            <p className="mt-1 text-xs text-muted">Category (keyword rules): {r.category}{r.category_keywords.length ? `, matched: ${r.category_keywords.join(", ")}` : ""}</p>
          </Card>
          <Card title={`Why priority ${r.priority_score}/100`}>
            {r.priority_factors.length === 0 ? <p className="text-sm text-muted">No risk factors detected.</p> : (
              <ul className="space-y-1 text-sm">{r.priority_factors.map((f) => <li key={f.factor} className="flex justify-between gap-2"><span>{f.factor}<span className="block text-xs text-muted">{f.detail}</span></span><span className="font-medium">+{f.points}</span></li>)}</ul>)}
            <p className="mt-2 text-xs text-muted">A transparent heuristic, not a calibrated probability.</p>
          </Card>
          <Card title="Reply copilot"><ReplyPanel reviewId={r.review_id} /></Card>
        </>)}
      </aside>
    </div>
  );
}

export default function Explorer() {
  const [params, setParams] = useSearchParams();
  const [f, setF] = useState(() => ({ ...INIT, priority: params.get("priority") ?? "" }));
  const [qInput, setQInput] = useState("");
  const [data, setData] = useState<ReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selected = params.get("id");

  useEffect(() => { const t = setTimeout(() => setF((p) => (p.q === qInput ? p : { ...p, q: qInput, page: 1 })), 300); return () => clearTimeout(t); }, [qInput]);
  const load = () => { setLoading(true); setError(null); api.reviews({ ...f, page_size: 15 }).then(setData).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false)); };
  useEffect(load, [f]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v, page: 1 }));
  const reset = () => { setQInput(""); setF({ ...INIT }); };
  const open = (id: string | null) => { const n = new URLSearchParams(params); id ? n.set("id", id) : n.delete("id"); setParams(n); };

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted">Search<input aria-label="Search reviews" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search review text" className={`${sel} w-52`} /></label>
          <label className="flex flex-col gap-1 text-xs text-muted">Sentiment<select aria-label="Sentiment filter" className={sel} value={f.sentiment} onChange={(e) => set("sentiment", e.target.value)}><option value="">All</option><option>Positive</option><option>Neutral</option><option>Negative</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-muted">Category<select aria-label="Category filter" className={sel} value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">All</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-muted">Priority<select aria-label="Priority filter" className={sel} value={f.priority} onChange={(e) => set("priority", e.target.value)}><option value="">All</option><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label className="flex flex-col gap-1 text-xs text-muted">Min rating<select aria-label="Minimum rating" className={sel} value={f.min_rating} onChange={(e) => set("min_rating", e.target.value)}><option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-muted">Max rating<select aria-label="Maximum rating" className={sel} value={f.max_rating} onChange={(e) => set("max_rating", e.target.value)}><option value="">Any</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-xs text-muted">Sort<select aria-label="Sort by" className={sel} value={`${f.sort}:${f.order}`} onChange={(e) => { const [s, o] = e.target.value.split(":"); setF((p) => ({ ...p, sort: s, order: o, page: 1 })); }}>
            <option value="priority_score:desc">Priority (high first)</option><option value="priority_score:asc">Priority (low first)</option><option value="date:desc">Newest</option><option value="date:asc">Oldest</option><option value="rating:asc">Rating (low first)</option><option value="rating:desc">Rating (high first)</option></select></label>
          <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden />Reset filters</Button>
          <a className={`${LinkButtonClass} ml-auto`} href={api.exportUrl()}><Download className="h-4 w-4" aria-hidden />Export CSV</a>
        </div>
      </Card>

      {error && <ErrorBox message={error} onRetry={load} />}
      {loading && !data && <Spinner />}
      {data && !data.has_data && data.has_data !== undefined && <Empty title="No dataset yet" text="Analyze a CSV first (or load the demo data) to explore reviews." />}
      {data && data.has_data !== false && (
        <Card>
          {data.items.length === 0 ? <Empty title="No reviews match" text="Try removing a filter or resetting them." /> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr><th className="py-2">ID</th><th>Review</th><th>Sentiment</th><th>Category</th><th>Priority</th><th>Rating</th><th /></tr></thead>
              <tbody className="divide-y divide-line">{data.items.map((r) => (
                <tr key={r.review_id} className="hover:bg-surface2/50"><td className="py-2 pr-3 whitespace-nowrap">{r.review_id}</td><td className="pr-3">{trunc(r.review_text, 80)}</td><td className="pr-3"><SentimentBadge value={r.sentiment} /></td>
                  <td className="pr-3">{r.category}</td><td className="pr-3"><PriorityBadge level={r.priority_level} score={r.priority_score} /></td><td className="pr-3">{r.rating ?? "n/a"}</td>
                  <td><Button variant="ghost" onClick={() => open(r.review_id)} aria-label={`Details for ${r.review_id}`}>Details</Button></td></tr>))}</tbody></table></div>)}
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <span>{data.total} result(s) · page {data.page} of {Math.max(data.pages, 1)}</span>
            <span className="flex gap-2"><Button variant="ghost" disabled={data.page <= 1} onClick={() => setF((p) => ({ ...p, page: p.page - 1 }))}>Previous</Button><Button variant="ghost" disabled={data.page >= data.pages} onClick={() => setF((p) => ({ ...p, page: p.page + 1 }))}>Next</Button></span>
          </div>
        </Card>
      )}
      {selected && <Drawer id={selected} onClose={() => open(null)} />}
    </>
  );
}
