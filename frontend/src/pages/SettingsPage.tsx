import { useState } from "react";
import { Badge, Button, Card, ErrorBox } from "../components/ui";
import { useData } from "../hooks/DataContext";
import { API_BASE, api, errorMessage } from "../lib/api";

export default function SettingsPage() {
  const { health, healthError, refreshHealth, refresh } = useData();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const clear = async () => {
    setErr(null); setMsg(null);
    try { await api.clear(); await refresh(); await refreshHealth(); setMsg("Active dataset cleared from server memory."); } catch (e) { setErr(errorMessage(e)); }
  };
  return (
    <>
      {err && <ErrorBox message={err} />}
      <Card title="API connection" action={<Button variant="ghost" onClick={refreshHealth}>Re-check</Button>}>
        <p className="text-sm text-muted">Backend URL: <code>{API_BASE}</code></p>
        <p className="mt-2 text-sm">{health ? <Badge tone="green">Online · v{health.version}</Badge> : <Badge tone="red">Offline</Badge>}</p>
        {healthError && <p className="mt-2 text-xs text-muted">{healthError}</p>}
      </Card>
      <Card title="Sentiment analysis mode">
        {health ? (<div className="space-y-1 text-sm">
          <p>Active: {health.sentiment.mode === "model" ? <Badge tone="green">Pretrained model</Badge> : <Badge tone="amber">Heuristic fallback</Badge>}</p>
          <p className="text-muted">Configured model: <code>{health.sentiment.model_name}</code></p>
          {health.sentiment.reason && <p className="text-muted">{health.sentiment.reason}</p>}
          <p className="text-xs text-muted">{health.sentiment.note}</p></div>) : <p className="text-sm text-muted">Unavailable while the backend is offline.</p>}
      </Card>
      <Card title="Optional LLM reply drafting">
        <p className="text-sm">{health ? (health.llm.configured ? <Badge tone="amber">Configured (review text is sent to your provider)</Badge> : <Badge>Not configured (template replies are used)</Badge>) : "Unknown"}</p>
        <p className="mt-2 text-sm text-muted">To enable it, set <code>LLM_ENABLED=true</code>, <code>LLM_BASE_URL</code>, <code>LLM_MODEL</code> and <code>LLM_API_KEY</code> in <code>backend/.env</code> and restart the backend. The key stays on the server and is never shown here.</p>
      </Card>
      <Card title="Privacy">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Uploaded reviews are held in the backend's memory only and are lost when it restarts. Nothing is written to a database.</li>
          <li>By default no review text leaves your backend. It is sent to an external provider only if you configure an LLM.</li>
          <li>Logs record counts, not review text. No authentication is implemented in this prototype.</li>
          <li>Replies are drafts and are never sent automatically.</li>
        </ul>
        <div className="mt-3 flex items-center gap-3"><Button variant="ghost" onClick={clear}>Clear active dataset</Button>{msg && <span className="text-sm text-emerald-500" role="status">{msg}</span>}</div>
      </Card>
    </>
  );
}
