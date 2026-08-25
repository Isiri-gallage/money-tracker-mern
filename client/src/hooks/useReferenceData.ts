import { useCallback, useEffect, useState } from "react";
import { getAccounts, type Account } from "../api/accounts";
import { getCategories, type Category } from "../api/categories";

/**
 * Accounts and categories are needed by most pages (they populate every
 * transaction form), so they are fetched together rather than page by page.
 */
export function useReferenceData() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [nextAccounts, nextCategories] = await Promise.all([getAccounts(), getCategories()]);
      setAccounts(nextAccounts);
      setCategories(nextCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: fetch on mount
    reload();
  }, [reload]);

  return { accounts, categories, loading, error, reload };
}
