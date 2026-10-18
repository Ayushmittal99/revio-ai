import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, Empty, ErrorBox, Spinner } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import type { Insights as InsightsT, Theme } from "../types";

const PALETTE = ["#8b83ee", "#6c63d9", "#a39df5", "#5b54b8", "#c4c0fa", "#7a72e0", "#9d97f0"];

function Themes({ title, themes }: { title: string; themes: Theme[] }) {
  return (
    <Card title={title}>
      {themes.length === 0 ? <p className="text-sm text-muted">No repeated keywords found.</p> : (
        <ul className="space-y-3">{themes.map((t) => (
          <li key={t.keyword} className="text-sm"><div className="flex items-center gap-2"><span className="font-medium">{t.keyword}</span><Badge>{t.reviews} reviews</Badge></div>
            {t.example && <p className="mt-0.5 text-xs text-muted">“{t.example.snippet}” <span className="opacity-70">({t.example.review_id})</span></p>}</li>))}</ul>)}
    </Card>
  );
}

export default function Insights() {
  const [d, setD] = useState<InsightsT | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => { setErr(null); api.insights().then(setD).catch((e) => setErr(errorMessage(e))); };
  useEffect(load, []);

  if (err) return <ErrorBox message={err} onRetry={load} />;
  if (!d) return <Spinner />;
  if (!d.has_data) return <Empty title="No insights yet" text="Insights are computed from your uploaded reviews. Analyze a dataset first."><Link className="text-accent" to="/analyze">Go to Analyze Reviews</Link></Empty>;
  const cats = (d.negative_category_counts ?? []).map((c) => c.name);
  return (
    <>
      <p className="text-sm text-muted">{d.note}</p>
      {!d.sufficient_for_themes && <ErrorBox message="Fewer than 5 reviews: themes below are weak signals only." />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Themes title="Frequent negative themes (keywords)" themes={d.negative_themes ?? []} />
        <Themes title="Frequent positive themes (keywords)" themes={d.positive_themes ?? []} />
      </div>
      <Card title="Negative reviews by category and month">
        {d.category_trend && d.category_trend.length > 0 ? (
          <div className="h-64"><ResponsiveContainer><BarChart data={d.category_trend}><CartesianGrid stroke="rgb(var(--line))" vertical={false} /><XAxis dataKey="month" stroke="#888" fontSize={12} /><YAxis allowDecimals={false} stroke="#888" /><Tooltip contentStyle={{ background: "rgb(var(--surface2))", border: "1px solid rgb(var(--line))", borderRadius: 8 }} /><Legend />
            {cats.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={PALETTE[i % PALETTE.length]} />)}</BarChart></ResponsiveContainer></div>
        ) : <p className="py-8 text-center text-sm text-muted">Not enough dated negative reviews for a category trend.</p>}
      </Card>
      <Card title="Recommendations">
        {(d.recommendations ?? []).length === 0 ? <p className="text-sm text-muted">No category has enough negative reviews (2 or more) to support a recommendation.</p> : (
          <ul className="space-y-4">{d.recommendations!.map((r) => (
            <li key={r.category} className="space-y-1 text-sm"><div className="flex items-center gap-2"><Badge tone="violet">{r.category}</Badge><span className="text-xs text-muted">Reviews: {r.review_ids.join(", ")}</span></div>
              <p><span className="font-medium">Measured: </span>{r.measured}</p><p className="text-muted"><span className="font-medium text-fg">Suggestion (not a finding): </span>{r.suggestion}</p></li>))}</ul>)}
      </Card>
    </>
  );
}
