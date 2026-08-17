"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useProjectSuggestions(): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("items").select("project").not("project", "is", null),
      supabase.from("recipes").select("project").not("project", "is", null),
    ]).then(([itemsRes, recipesRes]) => {
      const set = new Set<string>();
      for (const row of itemsRes.data ?? []) {
        if (row.project) set.add(row.project as string);
      }
      for (const row of recipesRes.data ?? []) {
        if (row.project) set.add(row.project as string);
      }
      setNames(Array.from(set).sort());
    });
  }, []);

  return names;
}
