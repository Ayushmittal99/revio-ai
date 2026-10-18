import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { PriorityLevel, Sentiment } from "../types";

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-medium">{title}</h2>}{action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  red: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
  violet: "bg-accent/15 text-accent border-accent/30",
  gray: "bg-surface2 text-muted border-line",
};
export const Badge = ({ tone = "gray", children }: { tone?: keyof typeof TONES; children: ReactNode }) => (
  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
);
export const SentimentBadge = ({ value }: { value: Sentiment }) => <Badge tone={value === "Positive" ? "green" : value === "Negative" ? "red" : "gray"}>{value}</Badge>;
export const PriorityBadge = ({ level, score }: { level: PriorityLevel; score?: number }) => (
  <Badge tone={level === "High" ? "red" : level === "Medium" ? "amber" : "green"}>{level}{score !== undefined ? ` · ${score}` : ""}</Badge>
);

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const v = variant === "primary" ? "bg-accent text-white hover:opacity-90" : "border border-line bg-surface2 hover:border-accent/50";
  return <button className={`${base} ${v} ${className}`} {...p} />;
}
export const LinkButtonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface2 px-3.5 py-2 text-sm font-medium hover:border-accent/50";

export const Spinner = ({ label = "Loading…" }: { label?: string }) => (
  <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{label}</div>
);
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden /><span className="flex-1">{message}</span>
      {onRetry && <Button variant="ghost" onClick={onRetry}>Retry</Button>}
    </div>
  );
}
export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line p-10 text-center">
      <Inbox className="h-6 w-6 text-muted" aria-hidden /><h3 className="font-medium">{title}</h3>
      <p className="max-w-md text-sm text-muted">{text}</p>{children}
    </div>
  );
}
export const trunc = (s: string, n = 90) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
