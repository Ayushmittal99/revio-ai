import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Empty, ErrorBox, LinkButtonClass, PriorityBadge, Spinner, trunc } from "../components/ui";
import { useData } from "../hooks/DataContext";
import { api, errorMessage } from "../lib/api";
import type { Insights, Review } from "../types";

export default function Reports() {
  const { summary, loading, error, refresh } = useData();
  const [ins, setIns] = useState<Insights | null>(null);
  const [high, setHigh] = useState<Review[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!summary?.has_data) return;
    Promise.all([api.insights(), api.reviews({ priority: "High", page_size: 20 })]).then(([i, h]) => { setIns(i); setHigh(h.items); }).catch((e) => setErr(errorMessage(e)));
  }, [summary]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={refresh} />;
  if (!summary?.has_data || !summary.kpis || !summary.stats) return <Empty title="No report available" text="Analyze a dataset first; reports only describe data that was actually processed."><Link className="text-accent" to="/analyze">Go to Analyze Reviews</Link></Empty>;
  const s = summary.stats;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Generated from the active dataset{summary.analyzed_at ? ` (analyzed ${new Date(summary.analyzed_at).toLocaleString()})` : ""}.</p>
        <a className={LinkButtonClass} href={api.exportUrl()}><Download className="h-4 w-4" aria-hidden />Download analyzed CSV</a>
      </div>
      {err && <ErrorBox message={err} />}
      <Card title="Dataset summary">
        <p className="text-sm">{summary.filename} {summary.is_demo && <Badge tone="violet">Synthetic demo data</Badge>}</p>
        <p className="mt-2 text-sm text-muted">{s.imported} rows imported, {s.valid} valid, {s.duplicate} duplicates skipped, {s.skipped} blank skipped, {s.processed} processed. Missing ratings: {s.warnings.missing_rating}. Invalid dates: {s.warnings.invalid_date}.</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Sentiment overview"><ul className="space-y-1 text-sm">{summary.sentiment_distribution?.map((d) => <li key={d.name} className="flex justify-between"><span>{d.name}</span><span>{d.value}</span></li>)}</ul></Card>
        <Card title="Category overview"><ul className="space-y-1 text-sm">{summary.category_distribution?.map((d) => <li key={d.name} className="flex justify-between"><span>{d.name}</span><span>{d.value}</span></li>)}</ul></Card>
      </div>
      <Card title={`High-priority reviews (${summary.kpis.high_priority})`}>
        {high.length === 0 ? <p className="text-sm text-muted">No high-priority reviews in this dataset.</p> : (
          <ul className="divide-y divide-line">{high.map((r) => <li key={r.review_id} className="space-y-1 py-2 text-sm"><div className="flex flex-wrap items-center gap-2"><PriorityBadge level={r.priority_level} score={r.priority_score} /><Badge>{r.category}</Badge>{r.safety_flag && <Badge tone="red">Safety wording</Badge>}<span className="text-xs text-muted">{r.review_id}</span></div>
            <p>{trunc(r.review_text, 140)}</p><p className="text-xs text-muted">{r.priority_explanation}</p></li>)}</ul>)}
      </Card>
      <Card title="Recommended follow-up actions">
        {!ins?.recommendations?.length ? <p className="text-sm text-muted">Not enough repeated negative feedback to support recommendations.</p> : (
          <ul className="space-y-2 text-sm">{ins.recommendations.map((r) => <li key={r.category}><span className="font-medium">{r.category}:</span> {r.suggestion} <span className="text-xs text-muted">({r.measured})</span></li>)}</ul>)}
      </Card>
    </>
  );
}
