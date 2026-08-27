import { useState, type ChangeEvent } from "react";
import { Upload, X, AlertTriangle } from "lucide-react";
import { formatCurrency } from "../lib/format";
import type { Account } from "../api/accounts";
import type { Category } from "../api/categories";
import { previewCsvImport, commitCsvImport, type ImportRow, type ImportPreview } from "../api/transactions";
import type { CurrencyCode } from "../lib/currencies";

interface Props {
  accounts: Account[];
  categories: Category[];
  currency: CurrencyCode;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportCsvModal({ accounts, categories, currency, onClose, onImported }: Props) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);
    try {
      const text = await file.text();
      const result = await previewCsvImport(text);
      setPreview(result);
      setSelected(new Set(result.rows.filter((r) => !r.duplicate).map((r) => r.rowIndex)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read CSV file");
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(rowIndex: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  async function handleImport() {
    if (!preview || !accountId || selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const transactions = preview.rows
        .filter((r) => selected.has(r.rowIndex))
        .map((r) => ({ date: r.date, description: r.description, amount: r.amount, type: r.type }));

      await commitCsvImport({ accountId, categoryId: categoryId || undefined, transactions });
      onImported();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import transactions");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "rounded-lg border border-line bg-card-hi px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-1 focus:ring-brand/40";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Import transactions from CSV</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-dim hover:bg-card-hi hover:text-ink">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-4 rounded-lg border border-neg/30 bg-neg/10 px-4 py-2.5 text-sm text-neg">{error}</p>
          )}

          {!preview ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line py-14 text-center">
              <Upload size={24} className="text-ink-faint" strokeWidth={1.5} />
              <p className="text-sm text-ink-dim">Upload a CSV exported from your bank</p>
              <label className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110">
                {loading ? "Reading…" : "Choose file"}
                <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" disabled={loading} />
              </label>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-ink-dim">Account</label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${inputClass} w-full`}>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[160px] flex-1">
                  <label className="mb-1 block text-xs font-medium text-ink-dim">Category (optional, applies to all)</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={`${inputClass} w-full`}>
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {preview.skipped.length > 0 && (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-warn">
                  <AlertTriangle size={13} strokeWidth={2.2} />
                  {preview.skipped.length} row(s) couldn't be read and were skipped.
                </p>
              )}

              <div className="overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-card-hi text-left text-xs text-ink-faint">
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.rows.map((r: ImportRow) => (
                      <tr key={r.rowIndex} className={r.duplicate ? "opacity-50" : ""}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selected.has(r.rowIndex)} onChange={() => toggleRow(r.rowIndex)} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-dim">{r.date}</td>
                        <td className="px-3 py-2 text-ink">
                          {r.description}
                          {r.duplicate && <span className="ml-2 text-xs text-warn">possible duplicate</span>}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                            r.type === "income" ? "text-pos" : "text-neg"
                          }`}
                        >
                          {formatCurrency(r.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {preview && (
          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <p className="text-xs text-ink-faint">
              {selected.size} of {preview.rows.length} selected
            </p>
            <button
              onClick={handleImport}
              disabled={loading || selected.size === 0 || !accountId}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Importing…" : `Import ${selected.size} transaction${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}