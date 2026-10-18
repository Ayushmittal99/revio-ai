import { CheckCircle2, Download, FileUp } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, ErrorBox, LinkButtonClass, trunc } from "../components/ui";
import { useData } from "../hooks/DataContext";
import { api, errorMessage } from "../lib/api";
import type { AnalyzeResponse, PreviewResponse, Stats } from "../types";

const COUNTS: [keyof Stats, string][] = [["imported", "Imported"], ["valid", "Valid"], ["duplicate", "Duplicates"], ["skipped", "Skipped"], ["processed", "Processed"]];

export default function Analyze() {
  const { refresh } = useData();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [phase, setPhase] = useState<"idle" | "previewing" | "analyzing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError(null); setResult(null); setPreview(null); setFile(null);
    if (!f.name.toLowerCase().endsWith(".csv")) { setError("Please choose a .csv file."); return; }
    setFile(f); setPhase("previewing");
    try { setPreview(await api.preview(f)); } catch (e) { setError(errorMessage(e)); setFile(null); } finally { setPhase("idle"); }
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); };
  const run = async (demo = false) => {
    setPhase("analyzing"); setError(null);
    try { const r = demo ? await api.analyzeSample() : await api.analyze(file!); setResult(r); await refresh(); }
    catch (e) { setError(errorMessage(e)); } finally { setPhase("idle"); }
  };

  return (
    <>
      <Card>
        <div role="button" tabIndex={0} aria-label="Upload CSV file" data-testid="dropzone"
          onClick={() => input.current?.click()} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${drag ? "border-accent bg-accent/10" : "border-line hover:border-accent/50"}`}>
          <FileUp className="h-7 w-7 text-accent" aria-hidden />
          <p className="font-medium">Drag and drop a CSV here, or click to browse</p>
          <p className="text-xs text-muted">Required column: review_text. Optional: review_id, date, rating, product, customer. Max 5 MB.</p>
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden" data-testid="file-input" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a className={LinkButtonClass} href={api.sampleUrl()}><Download className="h-4 w-4" aria-hidden />Download sample CSV (synthetic)</a>
          <Button variant="ghost" onClick={() => run(true)} disabled={phase !== "idle"}>Analyze synthetic demo data</Button>
        </div>
      </Card>

      {error && <ErrorBox message={error} />}
      {phase === "previewing" && <p role="status" className="text-sm text-muted">Validating file…</p>}

      {preview && file && (
        <Card title={`Preview: ${file.name}`}>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {COUNTS.map(([k, label]) => <Badge key={k} tone={k === "processed" ? "violet" : "gray"}>{label}: {preview.stats[k] as number}</Badge>)}
            <Badge>Encoding: {preview.encoding}</Badge>
          </div>
          <p className="mb-2 text-xs text-muted">Columns detected: {preview.columns.join(", ")}</p>
          <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-muted"><tr><th className="py-1">ID</th><th>Date</th><th>Rating</th><th>Product</th><th>Review</th></tr></thead>
            <tbody className="divide-y divide-line">{preview.rows.map((r) => <tr key={r.review_id}><td className="py-1.5 pr-2">{r.review_id}</td><td className="pr-2">{r.date ?? "n/a"}</td><td className="pr-2">{r.rating ?? "n/a"}</td><td className="pr-2">{r.product ?? "n/a"}</td><td>{trunc(r.review_text, 80)}</td></tr>)}</tbody></table></div>
          <p className="mt-2 text-xs text-muted">Showing the first {preview.rows.length} usable rows.</p>
          {preview.issues.length > 0 && (
            <details className="mt-3 text-sm"><summary className="cursor-pointer text-amber-600 dark:text-amber-300">{preview.issues.length} data issue(s): nothing is hidden</summary>
              <ul className="mt-2 space-y-1 text-xs text-muted">{preview.issues.map((i, n) => <li key={n}>Row {i.row}: {i.message}</li>)}</ul></details>
          )}
          <div className="mt-4">
            <Button onClick={() => run(false)} disabled={phase !== "idle"}>{phase === "analyzing" ? "Analyzing…" : `Run analysis on ${preview.stats.processed} reviews`}</Button>
            {phase === "analyzing" && <div role="progressbar" aria-label="Analysis in progress" className="mt-3 h-1.5 w-full overflow-hidden rounded bg-surface2"><div className="h-full w-1/3 animate-pulse rounded bg-accent" /></div>}
          </div>
        </Card>
      )}
      {phase === "analyzing" && !preview && <p role="status" className="text-sm text-muted">Analyzing demo data…</p>}

      {result && (
        <Card title="Analysis complete">
          <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />{result.stats.processed} reviews analyzed from {result.filename}.{result.is_demo && " (synthetic demo data)"}</p>
          <p className="mt-2 text-xs text-muted">Sentiment engine: {result.sentiment_engine.mode === "model" ? `pretrained model (${result.sentiment_engine.model_name})` : "heuristic fallback (word-list rules, not a pretrained model)"}.</p>
          <div className="mt-3 flex gap-2"><Link className={LinkButtonClass} to="/">View overview</Link><Link className={LinkButtonClass} to="/explorer">Open explorer</Link></div>
        </Card>
      )}
    </>
  );
}
