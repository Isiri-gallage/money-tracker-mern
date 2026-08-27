import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { sendChatMessage, type ChatTurn } from "../api/chat";

const SUGGESTIONS = [
  "How much did I spend this month?",
  "Break down my spending by category",
  "Am I over budget on anything?",
  "Show my recent grocery transactions",
];

export default function ChatPage() {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    setError(null);
    setInput("");
    const nextHistory: ChatTurn[] = [...history, { role: "user", text: question }];
    setHistory(nextHistory);
    setLoading(true);

    try {
      const { reply } = await sendChatMessage(question, history);
      setHistory([...nextHistory, { role: "model", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setHistory(history);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col px-6 py-8">
      <PageHeader title="AI Assistant" subtitle="Ask questions about your income, spending, and budgets" />

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-line bg-card">
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {history.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-info shadow-lg shadow-brand/25">
                <Sparkles size={20} className="text-white" strokeWidth={2.2} />
              </div>
              <p className="text-sm text-ink-dim">Ask me anything about your finances.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void ask(s)}
                    className="rounded-full border border-line bg-card-hi px-3 py-1.5 text-xs text-ink-dim transition-colors hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {history.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    turn.role === "user"
                      ? "bg-brand text-white"
                      : "bg-card-hi text-ink"
                  }`}
                >
                  {turn.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-card-hi px-4 py-2.5 text-sm text-ink-faint">Thinking…</div>
              </div>
            )}
          </div>

          <div ref={bottomRef} />
        </div>

        {error && <p className="border-t border-line px-4 py-2 text-xs text-neg">{error}</p>}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your spending…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-opacity disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={16} strokeWidth={2.2} />
          </button>
        </form>
      </div>
    </div>
  );
}
