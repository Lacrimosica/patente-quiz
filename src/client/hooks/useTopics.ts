import { useState, useEffect } from "react";

interface Filters {
  chapter?: number;
}

export function useTopics(filters: Filters = {}) {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const params = new URLSearchParams();
        if (filters.chapter !== undefined)
          params.set("chapter", String(filters.chapter));

        const url = `/api/topics${params.size > 0 ? `?${params}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: string[] = await res.json();
        setTopics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters.chapter]);

  return { topics, loading, error };
}