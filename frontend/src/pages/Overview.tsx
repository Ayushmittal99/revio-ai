import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, Empty, ErrorBox, PriorityBadge, SentimentBadge, Spinner, trunc } from "../components/ui";
import { useData } from "../hooks/DataContext";
import { api, errorMessage } from "../lib/api";
import type { Review } from "../types";

const SENT_COLORS: Record<string, string> = { Positive: "#34d399", Neutral: "#94a3b8", Negative: "#f87171" };
const ACCENT = "#8b83ee";
const tip = { contentStyle: { background: "rgb(var(--surface2))", border: "1px solid rgb(var(--line))", borderRadius: 8, color: "rgb(var(--fg))" } };

export default function Overview() {
  const { summary, loading, error, refresh } = useData();
  const nav = useNavigate();
  const [recent, setRecent] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [demoErr, setDemoErr] = useState<string | null>(null);

  useEffect(() => {
    if (summary?.has_data) api.reviews({ sort: "date", order: "desc", page_size: 5 }).then((r) => setRecent(r.items)).catch(() => setRecent([]));
  }, [summary]);

  const loadDemo = async () => {
    setBusy(true); setDemoErr(null);
    try { await api.analyzeSample(); await refresh(); } catch (e) { setDemoErr(errorMessage(e)); } finally { setBusy(false); }
  };

  const hero = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Customer feedback, turned into actionable intelligence.</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">Upload reviews, see sentiment and recurring issues, prioritise what needs attention, and draft replies for a human to approve.</p>
      </div>
      <Link to="/analyze" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">Analyze Reviews</Link>
    </div>
  );

  if (loading) return <>{hero}<Spinner /></>;
  if (error) return <>{hero}<ErrorBox message={error} onRetry={refresh} /></>;
  if (!summary?.has_data || !summary.kpis) {
    return (
      <>{hero}
        {demoErr && <ErrorBox message={demoErr} />}
        <Empty title="No dataset analyzed yet" text="Upload a CSV, or load the small synthetic demo dataset to explore the app. Demo data is labeled everywhere it appears.">
          <div className="mt-2 flex gap-2"><Button onClick={() => nav("/analyze")}>Upload CSV</Button><Button variant="ghost" onClick={loadDemo} disabled={busy}>{busy ? "Loading…" : "Load synthetic demo data"}</Button></div>
        </Empty>
      </>
    );
  }

  const k = summary.kpis;
  const kpis = [["Total reviews", k.total], ["Positive", `${k.positive_pct}%`], ["Negative", `${k.negative_pct}%`], ["High priority", k.high_priority]];
  return (
    <>
      {hero}
      <p className="text-xs text-muted">Dataset: {summary.filename}{summary.is_demo && " · synthetic data, not real customers"}</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(([label, value]) => (<Card key={label as string}><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></Card>))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sentiment distribution">
          <div className="h-64"><ResponsiveContainer><PieChart><Pie data={summary.sentiment_distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {summary.sentiment_distribution?.map((d) => <Cell key={d.name} fill={SENT_COLORS[d.name]} />)}</Pie><Tooltip {...tip} /><Legend /></PieChart></ResponsiveContainer></div>
        </Card>
        <Card title="Category distribution">
          <div className="h-64"><ResponsiveContainer><BarChart data={summary.category_distribution} layout="vertical" margin={{ left: 20 }}><CartesianGrid stroke="rgb(var(--line))" horizontal={false} />
            <XAxis type="number" allowDecimals={false} stroke="#888" /><YAxis type="category" dataKey="name" width={130} stroke="#888" fontSize={12} /><Tooltip {...tip} /><Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Review trend by month">
          {summary.trend && summary.trend.length > 0 ? (
            <div className="h-64"><ResponsiveContainer><LineChart data={summary.trend}><CartesianGrid stroke="rgb(var(--line))" /><XAxis dataKey="month" stroke="#888" fontSize={12} /><YAxis allowDecimals={false} stroke="#888" /><Tooltip {...tip} /><Legend />
              {["Positive", "Neutral", "Negative"].map((s) => <Line key={s} type="monotone" dataKey={s} stroke={SENT_COLORS[s]} strokeWidth={2} dot={false} />)}</LineChart></ResponsiveContainer></div>
          ) : <p className="py-10 text-center text-sm text-muted">No valid dates in this dataset, so no trend is shown.</p>}
        </Card>
        <Card title="Rating distribution">
          {summary.rating_distribution && summary.rating_distribution.length > 0 ? (
            <><div className="h-56"><ResponsiveContainer><BarChart data={summary.rating_distribution}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="rating" stroke="#888" /><YAxis allowDecimals={false} stroke="#888" /><Tooltip {...tip} /><Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
              {!!summary.missing_rating_count && <p className="mt-1 text-xs text-muted">{summary.missing_rating_count} review(s) have no usable rating.</p>}</>
          ) : <p className="py-10 text-center text-sm text-muted">No ratings available in this dataset.</p>}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Top negative theme">{summary.top_negative_theme ? <p><span className="text-lg font-semibold">{summary.top_negative_theme.category}</span><span className="ml-2 text-sm text-muted">{summary.top_negative_theme.count} negative reviews</span></p> : <p className="text-sm text-muted">No negative reviews.</p>}</Card>
        <Card title="Top positive theme">{summary.top_positive_theme ? <p><span className="text-lg font-semibold">{summary.top_positive_theme.category}</span><span className="ml-2 text-sm text-muted">{summary.top_positive_theme.count} positive reviews</span></p> : <p className="text-sm text-muted">No positive reviews.</p>}</Card>
        <Card title="Needing attention"><p><span className="text-lg font-semibold">{k.needs_human_review}</span><span className="ml-2 text-sm text-muted">flagged for human review</span></p></Card>
      </div>
      {!!summary.attention?.length && (
        <Card title="Reviews needing attention" action={<Link className="text-xs text-accent" to="/explorer?priority=High">View all</Link>}>
          <ul className="divide-y divide-line">{summary.attention.map((a) => (
            <li key={a.review_id} className="flex items-center gap-3 py-2 text-sm"><PriorityBadge level={a.priority_level} score={a.priority_score} />{a.safety_flag && <Badge tone="red">Safety wording</Badge>}<span className="flex-1">{trunc(a.review_text, 110)}</span>
              <Link className="text-accent" to={`/explorer?id=${a.review_id}`}>Details</Link></li>))}</ul>
        </Card>
      )}
      <Card title="Recent reviews">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr><th className="py-2">Date</th><th>Review</th><th>Sentiment</th><th>Category</th><th /></tr></thead>
          <tbody className="divide-y divide-line">{recent.map((r) => (
            <tr key={r.review_id}><td className="py-2 pr-3 whitespace-nowrap text-muted">{r.date ?? "n/a"}</td><td className="pr-3">{trunc(r.review_text, 70)}</td><td><SentimentBadge value={r.sentiment} /></td><td className="pr-3">{r.category}</td>
              <td><Link className="text-accent" to={`/explorer?id=${r.review_id}`}>Details</Link></td></tr>))}</tbody></table></div>
      </Card>
    </>
  );
}
