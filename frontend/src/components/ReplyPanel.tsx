import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { ReplyDraft, Tone } from "../types";
import { Badge, Button, ErrorBox } from "./ui";

export default function ReplyPanel({ reviewId }: { reviewId: string }) {
  const [tone, setTone] = useState<Tone>("Professional");
  const [variant, setVariant] = useState(0);
  const [draft, setDraft] = useState<ReplyDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async (v: number) => {
    setBusy(true); setError(null); setCopied(false);
    try { setDraft(await api.reply(reviewId, tone, v)); setVariant(v); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!draft) return;
    try { await navigator.clipboard.writeText(draft.draft); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError("Could not copy automatically. Select the text and copy it manually."); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted" htmlFor="tone">Tone</label>
        <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="rounded-lg border border-line bg-surface2 px-2 py-1.5 text-sm">
          <option>Professional</option><option>Friendly</option><option>Empathetic</option>
        </select>
        <Button onClick={() => generate(0)} disabled={busy}><Sparkles className="h-4 w-4" aria-hidden />Suggest reply</Button>
      </div>
      {error && <ErrorBox message={error} />}
      {draft && (
        <div className="space-y-2 rounded-lg border border-line bg-surface2 p-3">
          <div className="flex flex-wrap gap-2"><Badge tone="amber">Draft: human review required</Badge><Badge>{draft.source === "llm" ? "LLM draft" : "Template draft"}</Badge></div>
          <p data-testid="reply-draft" className="text-sm leading-relaxed">{draft.draft}</p>
          {draft.fallback_reason && <p className="text-xs text-muted">{draft.fallback_reason}</p>}
          <p className="text-xs text-muted">{draft.disclaimer}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={copy}>{copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}{copied ? "Copied" : "Copy reply"}</Button>
            <Button variant="ghost" onClick={() => generate(variant + 1)} disabled={busy}><RefreshCw className="h-4 w-4" aria-hidden />Regenerate</Button>
          </div>
        </div>
      )}
    </div>
  );
}
