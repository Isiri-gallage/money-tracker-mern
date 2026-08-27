import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { sendChatMessage, type ChatTurn } from "../api/chat";

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading, open]);

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
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-info">
                <Sparkles size={14} className="text-white" strokeWidth={2.2} />
              </div>
              <span className="text-sm font-semibold text-ink">AI Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1 text-ink-dim hover:bg-card-hi hover:text-ink"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {history.length === 0 && (
              <p className="px-1 text-xs text-ink-faint">Ask me anything about your finances.</p>
            )}

            <div className="space-y-2">
              {history.map((turn, i) => (
                <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      turn.role === "user" ? "bg-brand text-white" : "bg-card-hi text-ink"
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl bg-card-hi px-3 py-2 text-xs text-ink-faint">Thinking…</div>
                </div>
              )}
            </div>

            <div ref={bottomRef} />
          </div>

          {error && <p className="border-t border-line px-3 py-1.5 text-[11px] text-neg">{error}</p>}

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending…"
              className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-opacity disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={14} strokeWidth={2.2} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-info text-white shadow-lg shadow-brand/30 transition-transform hover:scale-105"
      >
        {open ? <X size={22} strokeWidth={2.2} /> : <MessageCircle size={22} strokeWidth={2.2} />}
      </button>
    </>
  );
}