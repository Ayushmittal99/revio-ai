import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../lib/api";
import ReplyPanel from "../components/ReplyPanel";
import { render } from "@testing-library/react";
import { HEALTH, REVIEW, SUMMARY, mockFetch, renderApp } from "./helpers";

beforeEach(() => vi.unstubAllGlobals());

describe("API client", () => {
  it("reports an unreachable backend clearly", async () => {
    mockFetch(() => new Error("down"));
    await expect(api.summary()).rejects.toThrow(/Cannot reach the backend/);
  });
  it("surfaces backend error messages", async () => {
    mockFetch(() => ({ __status: 400, error: { code: "missing_column", message: "Missing required column 'review_text'." } }));
    const err = await api.analyze(new File(["x"], "a.csv")).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toContain("review_text");
    expect(err.code).toBe("missing_column");
  });
});

describe("App", () => {
  it("navigates between pages", async () => {
    mockFetch((u) => (u.includes("/health") ? HEALTH : { has_data: false }));
    renderApp("/");
    await userEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(await screen.findByText("API connection")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Analyze Reviews" }));
    expect(await screen.findByTestId("dropzone")).toBeInTheDocument();
  });

  it("shows an error, not fake data, when the backend is down", async () => {
    mockFetch(() => new Error("down"));
    renderApp("/");
    expect(await screen.findByRole("alert")).toHaveTextContent(/Cannot reach the backend/);
    expect(screen.queryByText("Total reviews")).not.toBeInTheDocument();
    expect(screen.getByTestId("backend-status")).toHaveTextContent("offline");
  });

  it("shows an honest empty state with no dataset", async () => {
    mockFetch((u) => (u.includes("/health") ? HEALTH : { has_data: false }));
    renderApp("/");
    expect(await screen.findByText("No dataset analyzed yet")).toBeInTheDocument();
  });

  it("renders KPIs and demo badge from supplied data", async () => {
    mockFetch((u) => (u.includes("/health") ? HEALTH : u.includes("/api/summary") ? SUMMARY : { items: [REVIEW], total: 1, page: 1, page_size: 5, pages: 1 }));
    renderApp("/");
    expect(await screen.findByText("Total reviews")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText("39.3%")).toBeInTheDocument();
    expect(screen.getByText("46.4%")).toBeInTheDocument();
    expect(screen.getByText("Sentiment distribution")).toBeInTheDocument();
    expect(screen.getAllByText("Synthetic demo data").length).toBeGreaterThan(0);
  });

  it("CSV upload flow: validates and shows preview counts", async () => {
    const preview = { columns: ["review_text"], encoding: "utf-8", issues: [{ row: 3, kind: "blank_review", message: "Skipped: review_text is blank." }], rows: [{ review_id: "R0001", review_text: "Nice", date: null, rating: null, product: null }], stats: { ...SUMMARY.stats } };
    const f = mockFetch((u) => (u.includes("/health") ? HEALTH : u.includes("/preview") ? preview : { has_data: false }));
    renderApp("/analyze");
    const file = new File(["review_text\nNice\n"], "r.csv", { type: "text/csv" });
    fireEvent.change(await screen.findByTestId("file-input"), { target: { files: [file] } });
    expect(await screen.findByText(/Preview: r.csv/)).toBeInTheDocument();
    expect(screen.getByText("Duplicates: 1")).toBeInTheDocument();
    expect(screen.getByText(/1 data issue/)).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes("/api/reviews/preview"))).toBe(true);
  });

  it("rejects non-CSV files before calling the backend", async () => {
    const f = mockFetch((u) => (u.includes("/health") ? HEALTH : { has_data: false }));
    renderApp("/analyze");
    fireEvent.change(await screen.findByTestId("file-input"), { target: { files: [new File(["x"], "notes.txt")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(".csv");
    expect(f.mock.calls.some(([u]) => String(u).includes("preview"))).toBe(false);
  });

  it("explorer search and reset hit the API with the right params", async () => {
    const f = mockFetch((u) => (u.includes("/health") ? HEALTH : u.includes("/api/summary") ? SUMMARY : { has_data: true, items: [REVIEW], total: 1, page: 1, page_size: 15, pages: 1 }));
    renderApp("/explorer");
    await screen.findByText("Great product");
    await userEvent.type(screen.getByLabelText("Search reviews"), "refund");
    await waitFor(() => expect(f.mock.calls.some(([u]) => String(u).includes("q=refund"))).toBe(true));
    await userEvent.selectOptions(screen.getByLabelText("Sentiment filter"), "Negative");
    await waitFor(() => expect(f.mock.calls.some(([u]) => String(u).includes("sentiment=Negative"))).toBe(true));
    await userEvent.click(screen.getByRole("button", { name: /Reset filters/ }));
    expect(screen.getByLabelText("Search reviews")).toHaveValue("");
    expect(screen.getByLabelText("Sentiment filter")).toHaveValue("");
  });
});

describe("ReplyPanel", () => {
  it("generates a labeled draft and copies it", async () => {
    mockFetch(() => ({ review_id: "R001", tone: "Professional", draft: "Thank you for your feedback.", source: "template", fallback_reason: "No LLM configured", requires_human_review: true, disclaimer: "AI-generated draft.", safety_note: null }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ReplyPanel reviewId="R001" />);
    await userEvent.click(screen.getByRole("button", { name: /Suggest reply/ }));
    expect(await screen.findByTestId("reply-draft")).toHaveTextContent("Thank you");
    expect(screen.getByText(/human review required/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Copy reply/ }));
    expect(writeText).toHaveBeenCalledWith("Thank you for your feedback.");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/ })).toBeInTheDocument();
  });
});
