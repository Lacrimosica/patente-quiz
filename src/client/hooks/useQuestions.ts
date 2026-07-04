import { useState, useEffect } from "react";
import type { QuestionRow } from "../../shared/types";

interface Filters {
  chapter?: number;
  topic?: string;
  favoritesOnly?: boolean;
}

export function useQuestions(filters: Filters = {}) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
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
        if (filters.topic !== undefined)
          params.set("topic", filters.topic);
        if (filters.favoritesOnly)
          params.set("favoritesOnly", "true");

        const url = `/api/questions${params.size > 0 ? `?${params}` : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: QuestionRow[] = await res.json();
        setQuestions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filters.chapter, filters.topic, filters.favoritesOnly]);

  return { questions, loading, error };
}