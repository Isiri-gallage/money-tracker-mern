import { useAuth } from "../context/useAuth";
import { useReferenceData } from "../hooks/useReferenceData";
import PageHeader from "../components/PageHeader";
import RecurringPanel from "../components/RecurringPanel";

export default function RecurringPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { accounts, categories, loading, reload } = useReferenceData();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <PageHeader
        title="Recurring"
        subtitle="Transactions that post automatically on a schedule"
      />

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-faint">Loading…</p>
      ) : (
        <RecurringPanel accounts={accounts} categories={categories} currency={currency} onChanged={reload} />
      )}
    </div>
  );
}
